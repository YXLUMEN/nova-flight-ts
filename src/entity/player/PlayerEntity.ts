import {type KeyboardInput} from "../../input/KeyboardInput.ts";
import {World} from "../../world/World.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {ScreenFlash} from "../../effect/ScreenFlash.ts";
import {EdgeGlowEffect} from "../../effect/EdgeGlowEffect.ts";
import {TechTree} from "../../tech/TechTree.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import type {DataEntry} from "../data/DataEntry.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {DataLoader} from "../../DataLoader.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {AutoAim} from "../../tech/AutoAim.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import type {Item} from "../../item/Item.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {Items} from "../../item/items.ts";
import type {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: KeyboardInput;
    public readonly techTree: TechTree;

    public onDamageExplosionRadius = 320;
    public lockedCount = 0;

    public readonly weapons = new Map<Item, ItemStack>();
    public readonly baseWeapons: BaseWeapon[] = [];
    public currentBaseIndex: number = 0;
    private lastDamageTime = 0;

    private phaseScore: number;
    private score: number = 0;
    private autoAimEnable: boolean = false;
    private wasFire = false
    public steeringGear: boolean = false;

    public autoAim: AutoAim | null = null;

    public constructor(world: World, input: KeyboardInput) {
        super(EntityTypes.PLAYER_ENTITY, world);

        const viewport = document.getElementById('viewport') as HTMLElement;
        this.techTree = new TechTree(viewport, DataLoader.get('tech-data'));

        this.setMovementSpeed(0.8);
        this.setYaw(-1.57079);

        this.input = input;
        this.phaseScore = 0;

        this.addWeapon(Items.CANNON40_WEAPON, new ItemStack(Items.CANNON40_WEAPON));
        this.weapons.set(Items.BOMB_WEAPON, new ItemStack(Items.BOMB_WEAPON));
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
            if (this.autoAimEnable) WorldConfig.autoShoot = false;
        }

        if (dx !== 0 || dy !== 0) {
            const speedMultiplier = this.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.getMovementSpeed() * speedMultiplier;
            this.updateVelocity(speed, dx, dy);
        }
        this.moveByVec(this.getVelocityRef);
        this.adjustPosition();
        this.getVelocityRef.multiply(0.9);

        if (this.autoAimEnable && this.autoAim) {
            this.autoAim.tick();
        } else if (this.steeringGear) {
            const pointer = this.input.getPointer;
            this.setClampYaw(Math.atan2(
                pointer.y - posRef.y,
                pointer.x - posRef.x
            ), 0.157075);
        }

        if (this.input.wasPressed('KeyR')) {
            this.switchWeapon();
            return;
        }

        // 射击
        const fire = this.input.isDown("Space") || WorldConfig.autoShoot;
        const baseWeapon = this.baseWeapons[this.currentBaseIndex];
        const stack = this.weapons.get(baseWeapon)!;

        if (fire !== this.wasFire) {
            if (!this.wasFire) {
                baseWeapon.onStartFire(world);
            } else {
                baseWeapon.onEndFire(world);
            }
            this.wasFire = fire;
        }
        if (fire && baseWeapon.canFire(stack)) {
            baseWeapon.tryFire(stack, world, this);
        }

        for (const [w, stack] of this.weapons) {
            if (w instanceof SpecialWeapon) {
                if (WorldConfig.devMode && w.getCooldown(stack) > 0.5) w.setCooldown(stack, 0.5);
                if (w.canFire(stack) && this.input.wasPressed(w.bindKey())) w.tryFire(stack, world, this);
            }
            w.inventoryTick(stack, world, this);
        }
    }

    private switchWeapon() {
        const current = this.getCurrentItemStack().getItem() as BaseWeapon;
        current.onEndFire(this.getWorld());
        this.wasFire = false;
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        if (this.age - this.lastDamageTime < 50) return false;
        this.lastDamageTime = this.age;

        const world = this.getWorld();

        world.events.emit(EVENTS.BOMB_DETONATE, {
            pos: this.getPosition(),
            damage: 32,
            explosionRadius: this.onDamageExplosionRadius,
            shake: 0.5,
            flash: new ScreenFlash(0.3, 0.25, '#ff5151'),
            important: true,
            source: this,
            attacker: this
        });

        if (this.techTree.isUnlocked('electrical_energy_surges')) {
            const stack = this.weapons.get(Items.EMP_WEAPON);
            if (stack) {
                const emp = stack.getItem() as EMPWeapon;
                if (emp.canFire(stack) && this.techTree.isUnlocked('ele_shield')) {
                    emp.tryFire(stack, world, this);
                    SoundSystem.playSound(SoundEvents.SHIELD_CRASH);
                    return false;
                }
                const cd = emp.getCooldown(stack);
                emp.tryFire(stack, world, this);
                emp.setCooldown(stack, cd);
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

    public override onRemove() {
        super.onRemove();
        this.techTree.destroy();
        this.weapons.clear();
        this.baseWeapons.length = 0;
    }

    public override isPlayer() {
        return true;
    }

    public addWeapon(item: Item, stack: ItemStack): void {
        if (this.weapons.has(item)) return;

        if (item instanceof BaseWeapon) this.baseWeapons.push(item);
        this.weapons.set(item, stack);
    }

    public getCurrentItemStack(): ItemStack {
        return this.weapons.get(this.baseWeapons[this.currentBaseIndex])!;
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