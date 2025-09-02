import {type Input} from "../../Input.ts";
import {World} from "../../world/World.ts";
import {type Weapon} from "../../weapon/Weapon.ts";
import {BombWeapon} from "../../weapon/BombWeapon.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {ScreenFlash} from "../../effect/ScreenFlash.ts";
import {clamp} from "../../utils/math/math.ts";
import {Cannon40Weapon} from "../../weapon/Cannon40Weapon.ts";
import {throttleTimeOut} from "../../utils/uit.ts";
import {isSpecialWeapon} from "../../weapon/ISpecialWeapon.ts";
import {EdgeGlowEffect} from "../../effect/EdgeGlowEffect.ts";
import {TechTree} from "../../tech_tree/TechTree.ts";
import {BaseWeapon} from "../../weapon/BaseWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataLoader} from "../../DataLoader.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: Input;
    public readonly weapons = new Map<string, Weapon>();
    public readonly techTree: TechTree;

    public override speed = 6;
    public onDamageExplosionRadius = 320;

    public readonly baseWeapons: Weapon[] = [];
    public currentBaseIndex: number = 0;
    public switchWeapon = throttleTimeOut(() => {
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }, 200);
    private phaseScore: number;
    private score: number = 0;

    public constructor(world: World, input: Input) {
        super(EntityTypes.PLAYER_ENTITY, world);

        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new TechTree(viewport, DataLoader.get('tech-data'));

        this.setPos(World.W / 2, World.H - 80);

        this.input = input;
        this.phaseScore = 0;

        this.baseWeapons.push(new Cannon40Weapon(this));
        this.weapons.set('40', this.baseWeapons[0]);
        this.weapons.set('bomb', new BombWeapon(this));
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 3);
    }

    public override tick(tickDelta: number) {
        super.tick(tickDelta);

        const world = this.getWorld();
        const pos = this.getMutPos;

        // 指针移动
        if (WorldConfig.followPointer) {
            const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const worldMouse = this.input.pointer;
            const completeDt = Math.min(1, tickDelta * 6) * speedMultiplier;
            pos.add(
                (worldMouse.x - pos.x) * completeDt,
                (worldMouse.y - pos.y) * completeDt
            );
        } else {
            // 键盘移动
            let dx = 0, dy = 0;
            if (this.input.isDown("ArrowLeft", "KeyA")) dx -= 1;
            if (this.input.isDown("ArrowRight", "KeyD")) dx += 1;
            if (this.input.isDown("ArrowUp", "KeyW")) dy -= 1;
            if (this.input.isDown("ArrowDown", "KeyS")) dy += 1;

            const len = Math.hypot(dx, dy);
            if (len > 0) {
                const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
                pos.add(
                    (dx / len) * this.speed * speedMultiplier,
                    (dy / len) * this.speed * speedMultiplier
                );
            }
        }

        // 边界
        pos.x = clamp(pos.x, 20, World.W - 20);
        pos.y = clamp(pos.y, 20, World.H - 20);

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
            pos: this.getPos(),
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

        if (this.getHealth() === 1) {
            world.addEffect(new EdgeGlowEffect({
                color: '#ff5151',
                duration: 5.0,
                intensity: 0.5
            }));
        }

        return damageResult;
    }

    public override onDeath(_damageSource: DamageSource) {
        super.onDeath(_damageSource);
        this.getWorld().gameOver();
    }

    public addWeapon(name: string, weapon: Weapon): void {
        if (this.weapons.has(name)) return;

        if (weapon instanceof BaseWeapon) this.baseWeapons.push(weapon);
        this.weapons.set(name, weapon);
    }

    public getCurrentWeapon(): Weapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    public getPhaseScore() {
        return this.phaseScore;
    }

    public getScore() {
        return this.score;
    }

    public setPhaseScore(score: number) {
        this.phaseScore = Math.max(0, score);
    }

    public addPhaseScore(score: number) {
        this.setPhaseScore(this.phaseScore + score);
        this.setScore(this.score + score);
    }

    public setScore(score: number) {
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