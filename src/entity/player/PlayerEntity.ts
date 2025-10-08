import {World} from "../../world/World.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {EdgeGlowEffect} from "../../effect/EdgeGlowEffect.ts";
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
import type {NetworkChannel} from "../../network/NetworkChannel.ts";
import type {DataTrackerSerializedEntry} from "../data/DataTracker.ts";

export abstract class PlayerEntity extends LivingEntity {
    public onDamageExplosionRadius = 320;

    public techTree!: TechTree;
    protected readonly weapons = new Map<Item, ItemStack>();
    public readonly baseWeapons: BaseWeapon[] = [];
    public currentBaseIndex: number = 0;

    protected wasActive: boolean = false;

    private lastDamageTime = 0;
    private phaseScore: number = 0;
    private score: number = 0;

    public voidEdge = false;

    protected constructor(world: World) {
        super(EntityTypes.PLAYER, world);

        this.setMovementSpeed(2);
        this.setYaw(-1.57079);
        this.setPosition(World.WORLD_W / 2, World.WORLD_H);

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

    protected tickInventory(world: World) {
        for (const [w, stack] of this.weapons) {
            w.inventoryTick(stack, world, this, 0, true);
        }
    }

    public getNetworkHandler(): NetworkChannel {
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

        const world = this.getWorld();
        world.createExplosion(this, null, this.getX(), this.getY(), {
            damage: 32,
            explosionRadius: this.onDamageExplosionRadius,
            shake: 0.5,
            important: true,
            attacker: this
        });

        if (this.techTree.isUnlocked('electrical_energy_surges')) {
            const stack = this.weapons.get(Items.EMP_WEAPON);
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
        this.weapons.clear();
        this.baseWeapons.length = 0;
    }

    public override isPlayer() {
        return true;
    }

    public override shouldWrap(): boolean {
        return this.voidEdge;
    }

    public getItem(item: Item): ItemStack | null {
        return this.weapons.get(item) ?? null;
    }

    public getInventory(): ReadonlyMap<Item, ItemStack> {
        return this.weapons;
    }

    public addItem(item: Item, stack?: ItemStack): void {
        if (this.weapons.has(item)) return;

        if (item instanceof BaseWeapon) this.baseWeapons.push(item);
        if (!stack) stack = new ItemStack(item);
        stack.setHolder(this);
        this.weapons.set(item, stack);
    }

    public removeItem(item: Item): boolean {
        return this.weapons.delete(item);
    }

    public clearItems(): void {
        const stack = this.getCurrentItemStack();
        const current = stack.getItem() as BaseWeapon;
        current.onEndFire(stack, this.getWorld(), this);

        this.currentBaseIndex = 0;
        this.baseWeapons.length = 0;
        this.weapons.clear();
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
        nbt.putUint('PhaseScore', this.phaseScore);
        nbt.putInt8('SlotIndex', this.currentBaseIndex);

        const weapons: NbtCompound[] = [];
        this.weapons.values().forEach(stack => {
            weapons.push(stack.toNbt());
        });
        nbt.putCompoundList('Weapons', weapons);

        this.techTree.writeNBT(nbt);

        return nbt
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.setScore(nbt.getUint('Score'));
        this.setPhaseScore(nbt.getUint('PhaseScore'));

        this.techTree.readNBT(nbt);
        const weaponsNbt = nbt.getCompoundList('Weapons');
        if (weaponsNbt && weaponsNbt.length > 0) {
            this.weapons.clear();
            this.baseWeapons.length = 0;
            for (const wpn of weaponsNbt) {
                const stack = ItemStack.readNBT(wpn);
                if (stack) this.addItem(stack.getItem(), stack);
            }
        }
        this.currentBaseIndex = clamp(nbt.getInt8('SlotIndex'), 0, this.baseWeapons.length);
    }

    public onDataTrackerUpdate(_entries: DataTrackerSerializedEntry<any>[]): void {
    }

    public onTrackedDataSet(_data: TrackedData<any>): void {
    }
}