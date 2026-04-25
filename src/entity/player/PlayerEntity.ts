import {World} from "../../world/World.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {Item} from "../../item/Item.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {Items} from "../../item/Items.ts";
import type {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {clamp} from "../../utils/math/math.ts";
import type {TechTree} from "../../world/tech/TechTree.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {TrackedDataHandlerRegistry} from "../data/TrackedDataHandlerRegistry.ts";
import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";
import type {Constructor} from "../../type/types.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {Weapon} from "../../item/weapon/Weapon.ts";
import {BehaviourEnum, ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {UniqueInventory} from "./UniqueInventory.ts";

export abstract class PlayerEntity extends LivingEntity {
    private static readonly SHIELD_AMOUNT = DataTracker.registerData(Object(PlayerEntity), TrackedDataHandlerRegistry.FLOAT);

    public onDamageExplosionRadius = 320;
    protected techTree: TechTree | null = null;

    public readonly cooldownManager!: ItemCooldownManager;

    private readonly inventory: UniqueInventory;

    public wasFiring: boolean = false;
    protected invulnerableTime = 0;

    private score: number = 0;
    private isDev = false;
    private usedDev = false;

    protected constructor(world: World, itemCooldownManager: Constructor<ItemCooldownManager>) {
        super(EntityTypes.PLAYER, world);

        this.setMovementSpeed(2);
        this.setYaw(-1.57079);
        this.setPosition(World.WORLD_W / 2, World.WORLD_H - 100);

        this.inventory = new UniqueInventory(this);
        this.cooldownManager = new itemCooldownManager();
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 20);
    }

    protected override defineSyncedData(builder: InstanceType<typeof DataTracker.Builder>) {
        super.defineSyncedData(builder);
        builder.define(PlayerEntity.SHIELD_AMOUNT, 0);
    }

    public override tick() {
        super.tick();
        this.cooldownManager.tick();
    }

    public override aiStep() {
        this.inventoryTick();
        super.aiStep();

        this.move(this.velocityRef);
        this.clampPosition();
    }

    protected inventoryTick() {
        const world = this.getWorld();
        const selected = this.inventory.getSelectedSlot();

        for (let i = 0; i < this.inventory.tickSlotsLen(); i++) {
            const stack = this.inventory.getItem(i);
            if (stack.isEmpty()) continue;
            stack.inventoryTick(world, this, i, i === selected);
        }
    }

    protected override adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const bounds = this.getBoundingBox();
        if (map.intersectsBox(bounds)) {
            if (this.stuckTicks % 2 === 0) return movement.multiply(0.4);

            const eject = BlockCollision.findEjectionVector(map, this.positionRef, bounds);
            if (eject) return movement.set(eject.x, eject.y);
            return movement.multiply(0.4);
        }

        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;
        if (this.isClient()) return false;
        if (this.isDead()) return false;

        if (this.invulnerableTime > 0) return false;
        this.invulnerableTime = 20;

        if (this.techTree!.isUnlocked(Techs.EMERGENCY_WARP) && Math.random() >= 0.3) {
            this.invulnerableTime = 30;
            return false;
        }

        const raw = Math.pow(damage * 0.3, 0.8);
        const shake = clamp(raw, 0.4, 0.9);
        const visual = new ExplosionVisual(this.onDamageExplosionRadius);
        visual.shake = shake;

        const world = this.getWorld();
        world.createExplosion(this, null, this.getX(), this.getY(),
            2,
            new ExplosionBehavior(BehaviourEnum.ONLY_DAMAGE, undefined, false),
            visual
        );

        damage = this.modifyAppliedDamage(damageSource, damage);
        const remainDamage = Math.max(damage - this.getShieldAmount(), 0);
        this.setShieldAmount(this.getShieldAmount() - damage + remainDamage);

        // emp免伤
        const stack = this.inventory.searchItem(Items.EMP_WEAPON);
        if (!stack.isEmpty() && this.techTree!.isUnlocked(Techs.ELECTRICAL_SURGES)) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const cd = emp.getCooldown(stack);
            emp.tryFire(stack, world, this);
            emp.setCooldown(stack, cd);
        }

        if (remainDamage !== 0) {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            if (!stack.isEmpty() && emp.canFire(stack) && this.techTree!.isUnlocked(Techs.ELE_SHIELD)) {
                emp.tryFire(stack, world, this);
                world.playSound(this, SoundEvents.SHIELD_CRASH);
                return false;
            }

            this.setHealth(this.getHealth() - remainDamage);
            this.setShieldAmount(this.getShieldAmount() - remainDamage);

            for (const effect of this.getStatusEffects()) {
                effect.onEntityDamage(this, damageSource, remainDamage);
            }
            if (this.isDead()) this.onDeath(damageSource);
        }

        return true;
    }

    public override getShieldAmount(): number {
        return this.dataTracker.get(PlayerEntity.SHIELD_AMOUNT);
    }

    protected override setShieldAmountUnclamped(amount: number) {
        this.dataTracker.set(PlayerEntity.SHIELD_AMOUNT, amount);
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);
        this.getWorld().gameOver(this);
    }

    protected override onDiscard() {
        super.onDiscard();
        this.clearItems();
    }

    public override isPlayer(): this is PlayerEntity {
        return true;
    }

    public getTechs(): TechTree {
        return this.techTree!;
    }

    public getItem(item: Item): ItemStack {
        return this.inventory.searchItem(item);
    }

    public getInventory(): UniqueInventory {
        return this.inventory;
    }

    public addItem(item: Item, stack?: ItemStack): void {
        if (this.inventory.hasItem(item)) return;
        if (!stack) stack = item.getDefaultStack();

        stack.setHolder(this);
        if (item instanceof BaseWeapon) {
            this.inventory.addItem(stack);
        } else {
            const index = this.inventory.getEmptySlot(this.inventory.hotbarLength());
            if (index === -1) {
                this.sendMessage('背包已满');
                return;
            }
            this.inventory.setItem(index, stack);
        }
    }

    public removeItem(item: Item): boolean {
        const stack = this.getItem(item);
        if (stack.isEmpty()) return false;

        if (item instanceof Weapon) {
            item.onEndFire(stack, this.getWorld(), this);
        }
        this.inventory.removeInventoryItem(item);
        return true;
    }

    public clearItems(): void {
        const world = this.getWorld();
        for (const stack of this.inventory) {
            const item = stack.getItem();
            if (item instanceof Weapon) item.onEndFire(stack, world, this);
        }
        this.inventory.clearContent();
    }

    public switchWeapon(dir = 1) {
        const slot = this.inventory.getSelectedSlot();
        const len = this.inventory.hotbarLength();
        const next = ((slot + dir) % len + len) % len;
        if (next === slot) return;

        const stack = this.inventory.getSelectedItem();
        if (!stack.isEmpty()) {
            const current = stack.getItem() as BaseWeapon;
            current.onEndFire(stack, this.getWorld(), this);
        }

        this.wasFiring = false;
        this.inventory.setSelectedSlot(next);
    }

    public getCurrentItem(): ItemStack {
        return this.inventory.getSelectedItem();
    }

    public getScore(): number {
        return this.score;
    }

    public addScore(score: number): void {
        this.setScore(this.score + score);
    }

    public setScore(score: number): void {
        this.score = Math.max(0, score);
    }

    public consumeScore(value: number): boolean {
        const remain = this.score - value;
        if (remain < 0) return false;
        this.setScore(remain);
        return true;
    }

    public isDevMode(): boolean {
        return this.isDev;
    }

    public setDevMode(value: boolean): void {
        this.isDev = value;
        if (value) this.usedDev = true;
    }

    public isUsedBeDev(): boolean {
        return this.usedDev;
    }

    protected giveInitWeapon(): void {
        this.addItem(Items.CANNON40);
        this.addItem(Items.BOMB_WEAPON);
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.setUint32('score', this.score);
        nbt.setBoolean('dev_mode', this.isDevMode());
        nbt.setBoolean('used_be_dev', this.isUsedBeDev());

        this.inventory.writeNBT(nbt);
        this.techTree!.writeNBT(nbt);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.setScore(nbt.getUint32('score'));
        this.setDevMode(nbt.getBoolean('dev_mode'));
        this.usedDev = nbt.getBoolean('used_be_dev');

        this.techTree!.readNBT(nbt);
        this.inventory.readNBT(nbt);
        // todo 玩家重生
        if (this.getHealth() === 0) this.setHealth(this.getMaxHealth());
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}