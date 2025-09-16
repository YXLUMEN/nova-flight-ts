import type {Item} from "./Item.ts";
import type {Entity} from "../entity/Entity.ts";
import {Items} from "./items.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {TagKey} from "../registry/tag/TagKey.ts";
import {ComponentMap} from "../component/ComponentMap.ts";
import type {World} from "../world/World.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {clamp} from "../utils/math/math.ts";
import type {ComponentType} from "../component/ComponentType.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";

export class ItemStack {
    // @ts-ignore
    public static readonly EMPTY = new ItemStack(null, 0, ComponentMap.EMPTY);

    private readonly item: Item | null;
    private readonly components: ComponentMap;
    private count: number;
    private holder: Entity | null = null;

    public constructor(item: Item, count: number = 1, components?: ComponentMap) {
        this.item = item;
        if (components === undefined) {
            this.components = new ComponentMap(item.getComponents());
        } else {
            this.components = components;
        }
        this.count = count;
    }

    public isEmpty(): boolean {
        return this === ItemStack.EMPTY || this.item === Items.AIR || this.count <= 0;
    }

    public getItem(): Item {
        return this.isEmpty() ? Items.AIR : this.item!;
    }

    public getComponents() {
        return this.components;
    }

    public has(type: ComponentType<any>): boolean {
        return this.components.has(type);
    }

    public set<T>(type: ComponentType<T>, value: T | null): void {
        this.components.set(type, value);
    }

    public get<T>(type: ComponentType<T>): T | null {
        return this.components.get(type);
    }

    public getOrDefault<T>(type: ComponentType<T>, fallback: T): T {
        return this.components.getOrDefault(type, fallback);
    }

    public getRegistryEntry(): RegistryEntry<Item> {
        return this.getItem().getRegistryEntry();
    }

    public isIn(tag: TagKey<Item>): boolean {
        return this.getItem().getRegistryEntry().isIn(tag);
    }

    public isOf(item: Item): boolean {
        return this.getItem() === item;
    }

    public rightClick(world: World, user: PlayerEntity) {
        this.getItem().rightClick(world, user);
    }

    public leftClick(world: World, user: PlayerEntity) {
        this.getItem().leftClick(world, user);
    }

    public isDamageable() {
        return this.has(DataComponentTypes.MAX_DAMAGE) && !this.has(DataComponentTypes.UNBREAKABLE) && this.has(DataComponentTypes.DAMAGE);
    }

    public getDamage(): number {
        return clamp(this.components.getOrDefault(DataComponentTypes.DAMAGE, 0), 0, this.getMaxDamage());
    }

    public setDamage(damage: number) {
        this.components.set(DataComponentTypes.DAMAGE, clamp(damage, 0, this.getMaxCount()));
    }

    public getMaxDamage(): number {
        return this.components.getOrDefault(DataComponentTypes.MAX_DAMAGE, 0);
    }

    public damage(amount: number, breakCallback: (item: Item) => void): void {
        if (!this.isDamageable() || amount <= 0) return;

        const remain = this.getDamage() + amount;
        this.setDamage(remain);
        if (remain >= this.getMaxDamage()) {
            this.decrement(1);
            breakCallback(this.getItem());
        }
    }

    public postHit(target: LivingEntity, attacker: LivingEntity): boolean {
        return this.getItem().postHit(this, target, attacker);
    }

    public copy(): ItemStack {
        if (this.isEmpty()) {
            return ItemStack.EMPTY;
        }
        return new ItemStack(this.getItem(), this.count, this.components.copy());
    }

    public setHolder(holder: Entity | null): void {
        if (!this.isEmpty()) {
            this.holder = holder;
        }
    }

    public getHolder(): Entity | null {
        return !this.isEmpty() ? this.holder : null;
    }

    public getCount(): number {
        return this.isEmpty() ? 0 : this.count;
    }

    public setCount(count: number) {
        this.count = count;
    }

    public getMaxCount(): number {
        return this.components.getOrDefault(DataComponentTypes.MAX_STACK_SIZE, 1);
    }

    public increment(amount: number) {
        this.setCount(this.getCount() + amount);
    }

    public decrement(amount: number) {
        this.increment(-amount);
    }
}