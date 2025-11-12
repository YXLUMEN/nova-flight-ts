import {World} from "../../world/World.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {type DamageSource} from "../damage/DamageSource.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {Item} from "../../item/Item.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {Items} from "../../item/items.ts";
import type {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";
import {clamp} from "../../utils/math/math.ts";
import type {TechTree} from "../../tech/TechTree.ts";
import type {DataTrackerSerializedEntry} from "../data/DataTracker.ts";
import type {INetworkChannel} from "../../network/INetworkChannel.ts";
import {SpecialWeapon} from "../../item/weapon/SpecialWeapon.ts";

export abstract class PlayerEntity extends LivingEntity {
    public onDamageExplosionRadius = 320;
    public techTree!: TechTree;

    protected readonly items = new Map<Item, ItemStack>();
    protected weaponKeys = new Map<SpecialWeapon, string>();
    protected readonly baseWeapons: BaseWeapon[] = [];
    protected currentBaseIndex: number = 0;

    protected wasActive: boolean = false;
    private lastDamageTime = 0;
    public voidEdge = false;

    private score: number = 0;

    protected constructor(world: World) {
        super(EntityTypes.PLAYER, world);

        this.setMovementSpeed(2);
        this.setYaw(-1.57079);
        this.setPosition(World.WORLD_W / 2, World.WORLD_H - 100);

        this.addItem(Items.CANNON40_WEAPON);
        this.addItem(Items.BOMB_WEAPON);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 20);
    }

    public override tick() {
        super.tick();

        this.moveByVec(this.getVelocityRef);
        this.shouldWrap() ? this.wrapPosition() : this.adjustPosition();
        this.tickInventory(this.getWorld());
    }

    public override tickMovement() {
        this.getVelocityRef.multiply(0.9);
    }

    public getNetworkChannel(): INetworkChannel {
        return this.getWorld().getNetworkChannel();
    }

    public switchWeapon(dir = 1) {
        const stack = this.getCurrentItemStack();
        const current = stack.getItem() as BaseWeapon;
        current.onEndFire(stack, this.getWorld(), this);

        this.wasActive = false;
        const next = (this.currentBaseIndex + dir) % this.baseWeapons.length;
        this.currentBaseIndex = next < 0 ? this.baseWeapons.length - 1 : next;
    }

    public override isInvulnerableTo(damageSource: DamageSource): boolean {
        return super.isInvulnerableTo(damageSource) || WorldConfig.devMode;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        if (this.age - this.lastDamageTime < 50) return false;
        this.lastDamageTime = this.age;

        const raw = Math.pow(damage * 0.3, 0.8);
        const shake = clamp(raw, 0.4, 0.9);

        const world = this.getWorld();
        world.createExplosion(this, null, this.getX(), this.getY(), {
            damage: 32,
            explosionRadius: this.onDamageExplosionRadius,
            important: true,
            attacker: this,
            shake
        });

        if (this.techTree.isUnlocked('electrical_energy_surges')) {
            const stack = this.items.get(Items.EMP_WEAPON);
            if (stack) {
                const emp = stack.getItem() as EMPWeapon;
                if (emp.canFire(stack) && this.techTree.isUnlocked('ele_shield')) {
                    emp.tryFire(stack, world, this);
                    world.playSound(this, SoundEvents.SHIELD_CRASH);
                    return false;
                }
                const cd = emp.getCooldown(stack);
                emp.tryFire(stack, world, this);
                emp.setCooldown(stack, cd);
            }
        }

        return super.takeDamage(damageSource, damage);
    }

    public override onDeath(damageSource: DamageSource) {
        super.onDeath(damageSource);
        this.getWorld().gameOver();
    }

    public override onRemove() {
        super.onRemove();
        this.clearItems();
    }

    public override isPlayer(): this is PlayerEntity {
        return true;
    }

    public override shouldWrap(): boolean {
        return this.voidEdge;
    }

    private assignKeys() {
        let i = 0;
        for (const w of this.items.keys()) {
            if (!(w instanceof SpecialWeapon)) continue;
            i++;
            this.weaponKeys.set(w, `Digit${i}`);
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
        const result = this.items.delete(item);
        this.assignKeys();
        return result;
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

    public getCurrentItem(): BaseWeapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

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

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.putUint('Score', this.score);
        nbt.putByte('SlotIndex', this.currentBaseIndex);

        const weapons: NbtCompound[] = [];
        this.items.values().forEach(stack => {
            weapons.push(stack.toNbt());
        });
        nbt.putCompoundList('Weapons', weapons);

        this.techTree.writeNBT(nbt);

        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.setScore(nbt.getUint('Score'));

        this.techTree.readNBT(nbt);/*
        const weaponsNbt = nbt.getCompoundList('Weapons');
        if (weaponsNbt && weaponsNbt.length > 0) {
            const stacks: ItemStack[] = [];
            for (const wpn of weaponsNbt) {
                const stack = ItemStack.readNBT(wpn);
                if (stack) stacks.push(stack);
            }

            if (stacks.length > 0) {
                this.clearItems();
                stacks.forEach(stack => this.addItem(stack.getItem(), stack));
            }
        }*/
        this.currentBaseIndex = clamp(nbt.getByte('SlotIndex'), 0, this.baseWeapons.length);
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }

    protected tickInventory(world: World) {
        for (const [w, stack] of this.items) {
            w.inventoryTick(stack, world, this, 0, true);
        }
    }
}