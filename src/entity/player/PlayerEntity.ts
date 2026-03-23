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
import type {TechTree} from "../../tech/TechTree.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";
import {TrackedDataHandlerRegistry} from "../data/TrackedDataHandlerRegistry.ts";
import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";
import type {Constructor} from "../../apis/types.ts";
import {Techs} from "../../tech/Techs.ts";
import {Weapon} from "../../item/weapon/Weapon.ts";
import {BehaviourEnum, ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import {BlockCollision} from "../../world/collision/BlockCollision.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";

export abstract class PlayerEntity extends LivingEntity {
    private static readonly SHIELD_AMOUNT = DataTracker.registerData(Object(PlayerEntity), TrackedDataHandlerRegistry.FLOAT);

    public onDamageExplosionRadius = 320;
    protected techTree: TechTree | null = null;

    public readonly cooldownManager!: ItemCooldownManager;
    protected readonly items = new Map<Item, ItemStack>();
    protected readonly weaponKeys = new Map<SpecialWeapon, string>();
    protected readonly baseWeapons: BaseWeapon[] = [];
    protected currentBaseIndex: number = 0;

    public wasFiring: boolean = false;
    public lastDamageTime = 0;

    private score: number = 0;
    private isDev = false;
    private usedDev = false;

    protected constructor(world: World, itemCooldownManager: Constructor<ItemCooldownManager>) {
        super(EntityTypes.PLAYER, world);

        this.setMovementSpeed(2);
        this.setYaw(-1.57079);
        this.setPosition(World.WORLD_W / 2, World.WORLD_H - 100);

        this.cooldownManager = new itemCooldownManager();
        this.addItem(Items.CANNON40_WEAPON);
        this.addItem(Items.BOMB_WEAPON);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 20);
    }

    protected override initDataTracker(builder: InstanceType<typeof DataTracker.Builder>) {
        super.initDataTracker(builder);
        builder.add(PlayerEntity.SHIELD_AMOUNT, 0);
    }

    public override tick() {
        super.tick();

        this.tickInventory(this.getWorld());
        this.cooldownManager.update();
    }

    public override tickMovement() {
        super.tickMovement();

        this.move(this.getVelocityRef);
        this.clampPosition();

        if (!this.isDevMode() && this.stuckTicks >= 240) {
            const damageSource = this.getWorld().getDamageSources().generic();
            this.takeDamage(damageSource, 4);
        }
    }

    protected override adjustBlockCollision(movement: MutVec2): MutVec2 {
        const map = this.getWorld().getMap();
        const bounds = this.getBoundingBox();
        if (map.intersectsBox(bounds)) {
            if (this.stuckTicks % 2 === 0) return movement.multiply(0.4);

            const eject = BlockCollision.findEjectionVector(map, this.getPositionRef, bounds);
            if (eject) return movement.set(eject.x, eject.y);
            return movement.multiply(0.4);
        }

        return BlockCollision.separatingCollision(map, bounds, movement);
    }

    protected tickInventory(world: World) {
        const currentItem = this.getCurrentItem();
        for (const [item, stack] of this.items) {
            item.inventoryTick(stack, world, this, 0, currentItem === item);
        }
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;
        if (this.getWorld().isClient) return false;
        if (this.isDead()) return false;

        if (this.age - this.lastDamageTime < 20) return false;
        this.lastDamageTime = this.age;

        if (this.techTree!.isUnlocked(Techs.EMERGENCY_WARP) && Math.random() >= 0.3) {
            this.lastDamageTime = this.age + 30;
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
        const stack = this.items.get(Items.EMP_WEAPON);
        const emp = stack?.getItem() as EMPWeapon | undefined;
        if (this.techTree!.isUnlocked(Techs.ELECTRICAL_SURGES) && stack && emp) {
            const cd = emp.getCooldown(stack);
            emp.tryFire(stack, world, this);
            emp.setCooldown(stack, cd);
        }

        if (remainDamage !== 0) {
            if (stack && emp && emp.canFire(stack) && this.techTree!.isUnlocked(Techs.ELE_SHIELD)) {
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

    private assignKeys() {
        for (const w of this.items.keys()) {
            if (w instanceof SpecialWeapon) {
                this.weaponKeys.set(w, `Digit${w.getSortIndex() + 1}`);
            }
        }
    }

    public getItem(item: Item): ItemStack | null {
        return this.items.get(item) ?? null;
    }

    public getInventory(): ReadonlyMap<Item, ItemStack> {
        return this.items;
    }

    public addItem(item: Item, stack?: ItemStack): void {
        if (this.items.has(item)) return;

        if (item instanceof BaseWeapon) this.baseWeapons.push(item);
        if (!stack) stack = new ItemStack(item);
        stack.setHolder(this);
        this.items.set(item, stack);
        this.assignKeys();
    }

    public removeItem(item: Item): boolean {
        const stack = this.getItem(item);
        if (!stack) return false;
        this.items.delete(item);

        if (item instanceof Weapon) {
            item.onEndFire(stack, this.getWorld(), this);
        }
        if (item instanceof BaseWeapon) {
            const index = this.baseWeapons.indexOf(item);
            if (index >= 0) {
                this.baseWeapons.splice(index, 1);
                this.currentBaseIndex = clamp(index - 1, 0, this.baseWeapons.length - 1);
            }
        }
        this.assignKeys();
        return true;
    }

    public clearItems(): void {
        const stack = this.getCurrentItemStack();
        if (stack) {
            const current = stack.getItem() as BaseWeapon;
            current.onEndFire(stack, this.getWorld(), this);
        }

        this.currentBaseIndex = 0;
        this.baseWeapons.length = 0;
        this.items.clear();
        this.weaponKeys.clear();
    }

    public switchWeapon(dir = 1) {
        const next = (this.currentBaseIndex + dir) % this.baseWeapons.length;
        if (next === this.currentBaseIndex) return;

        const stack = this.getCurrentItemStack();
        const current = stack.getItem() as BaseWeapon;
        current.onEndFire(stack, this.getWorld(), this);

        this.wasFiring = false;
        this.currentBaseIndex = next < 0 ? this.baseWeapons.length - 1 : next;
    }

    public getCurrentItem(): BaseWeapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    // 如果玩家被清除, 有可能返回 undefined
    public getCurrentItemStack(): ItemStack {
        return this.items.get(this.baseWeapons[this.currentBaseIndex])!;
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

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint32('score', this.score);
        nbt.putInt8('slot_index', this.currentBaseIndex);
        nbt.putBoolean('dev_mode', this.isDevMode());
        nbt.putBoolean('used_be_dev', this.isUsedBeDev());

        const inventory: NbtCompound[] = [];
        this.items.values().forEach(stack => {
            inventory.push(ItemStack.CODEC.encode(stack) as NbtCompound);
        });
        nbt.putCompoundArray('inventory', inventory);
        this.techTree!.writeNBT(nbt);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.setScore(nbt.getUint32('score'));
        this.setDevMode(nbt.getBoolean('dev_mode'));
        this.usedDev = nbt.getBoolean('used_be_dev');

        this.techTree!.readNBT(nbt);

        const inventory = nbt.getCompoundArray('inventory');
        if (inventory.length > 0) {
            this.clearItems();
            for (const nbt of inventory) {
                const stack = ItemStack.CODEC.decode(nbt);
                if (!stack) continue;

                stack.setHolder(this);
                this.addItem(stack.getItem(), stack);
            }
        }

        this.currentBaseIndex = clamp(nbt.getInt8('slot_index'), 0, this.baseWeapons.length);

        // todo 玩家重生
        if (this.getHealth() === 0) this.setHealth(this.getMaxHealth());
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}