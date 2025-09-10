import {type Input} from "../../Input.ts";
import {World} from "../../world/World.ts";
import {type Weapon} from "../../weapon/Weapon.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {ScreenFlash} from "../../effect/ScreenFlash.ts";
import {Cannon40Weapon} from "../../weapon/Cannon40Weapon.ts";
import {throttleTimeOut} from "../../utils/uit.ts";
import {isSpecialWeapon} from "../../weapon/ISpecialWeapon.ts";
import {EdgeGlowEffect} from "../../effect/EdgeGlowEffect.ts";
import {TechTree} from "../../tech/TechTree.ts";
import {BaseWeapon} from "../../weapon/BaseWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataLoader} from "../../DataLoader.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {AutoAim} from "../../tech/AutoAim.ts";
import {clamp} from "../../utils/math/math.ts";
import {BombWeapon} from "../../weapon/BombWeapon.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: Input;
    public readonly techTree: TechTree;

    public onDamageExplosionRadius = 320;

    public readonly weapons = new Map<string, Weapon>();
    public readonly baseWeapons: BaseWeapon[] = [];
    public currentBaseIndex: number = 0;

    private switchWeapon = throttleTimeOut(() => {
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }, 200);

    private phaseScore: number;
    private score: number = 0;
    private autoAimEnable: boolean = false;
    public steeringGear: boolean = false;

    public autoAim: AutoAim | null = null;

    public constructor(world: World, input: Input) {
        super(EntityTypes.PLAYER_ENTITY, world);

        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new TechTree(viewport, DataLoader.get('tech-data'));

        this.setPosition(World.W / 2, World.H - 80);
        this.setMovementSpeed(6);
        this.setYaw(-1.55);

        this.input = input;
        this.phaseScore = 0;

        this.baseWeapons.push(new Cannon40Weapon(this));
        this.weapons.set('40', this.baseWeapons[0]);
        this.weapons.set('bomb', new BombWeapon(this));
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 20);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld();
        const posRef = this.getPositionRef;

        // 移动
        let dx = 0, dy = 0;
        if (this.input.isDown("ArrowLeft", "KeyA")) dx -= 1;
        if (this.input.isDown("ArrowRight", "KeyD")) dx += 1;
        if (this.input.isDown("ArrowUp", "KeyW")) dy -= 1;
        if (this.input.isDown("ArrowDown", "KeyS")) dy += 1;
        if (this.input.wasPressed('AltRight') && this.autoAim) {
            this.autoAimEnable = !this.autoAimEnable;
            this.autoAim.setTarget(null);
        }

        const len = Math.hypot(dx, dy);
        if (len > 0) {
            const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.getMovementSpeed() * speedMultiplier;
            this.updateVelocity(speed, dx / len, dy / len);
            this.moveByVec(this.getVelocity());
            posRef.x = clamp(posRef.x, 20, World.W - 20);
            posRef.y = clamp(posRef.y, 20, World.H - 20);
        } else {
            this.updateVelocity(0, 0, 0);
        }

        if (this.autoAimEnable && this.autoAim) {
            this.autoAim.tick();
        } else if (this.steeringGear) {
            this.setClampYaw(Math.atan2(
                this.input.getWorldPointer.y - posRef.y,
                this.input.getWorldPointer.x - posRef.x
            ), 0.157075);
        }

        if (this.input.isDown('KeyR')) {
            this.switchWeapon();
            return;
        }

        // 射击
        if (this.input.isDown("Space") || WorldConfig.autoShoot) {
            const w = this.baseWeapons[this.currentBaseIndex];
            if (w.canFire()) w.tryFire(world);
        }

        for (const w of this.weapons.values()) {
            if (isSpecialWeapon(w)) {
                if (WorldConfig.devMode && w.getCooldown() > 0.5) w.setCooldown(0.5);
                if (w.canFire() && this.input.wasPressed(w.bindKey())) w.tryFire(world);
            }
            w.tick();
        }
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        const world = this.getWorld();

        world.events.emit(EVENTS.BOMB_DETONATE, {
            pos: this.getPosition(),
            damage: 32,
            explosionRadius: this.onDamageExplosionRadius,
            shake: 0.4,
            flash: new ScreenFlash(0.2, 0.25, '#ff5151'),
            important: true,
            source: this,
            attacker: this
        });

        if (this.techTree.isUnlocked('ele_shield')) {
            const emp = this.weapons.get('emp');
            if (emp && emp.canFire()) {
                emp.tryFire(world);
                SoundSystem.playSound(SoundEvents.SHIELD_CRASH);
                return false;
            }
        }

        if (this.techTree.isUnlocked('electrical_energy_surges')) {
            const emp = this.weapons.get('emp');
            if (emp) {
                const cd = emp.getCooldown();
                emp.tryFire(world);
                emp.setCooldown(cd);
            }
        }

        const damageResult = super.takeDamage(damageSource, damage);

        if (this.getHealth() <= 5) {
            world.addEffect(new EdgeGlowEffect({
                color: '#ff5151',
                duration: 5.0,
                intensity: 0.5
            }));
        }

        return damageResult;
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);
        this.getWorld().gameOver();
    }

    public addWeapon(name: string, weapon: Weapon): void {
        if (this.weapons.has(name)) return;

        if (weapon instanceof BaseWeapon) this.baseWeapons.push(weapon);
        this.weapons.set(name, weapon);
    }

    public getCurrentWeapon(): BaseWeapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    public getPhaseScore(): number {
        return this.phaseScore;
    }

    public getScore(): number {
        return this.score;
    }

    public setPhaseScore(score: number): void {
        this.phaseScore = Math.max(0, score);
    }

    public addPhaseScore(score: number): void {
        this.setPhaseScore(this.phaseScore + score);
        this.setScore(this.score + score);
    }

    public setScore(score: number): void {
        this.score = Math.max(0, score);
        TechTree.playerScore.textContent = `点数: ${this.score}`;
    }

    public consumeScore(value: number): boolean {
        const remain = this.score - value;
        if (remain < 0) return false;
        this.setScore(remain);
        return true;
    }

    public onDataTrackerUpdate(_entries: DataEntry<any>): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}