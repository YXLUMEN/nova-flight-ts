import type {Item} from "./Item.ts";
import type {Entity} from "../entity/Entity.ts";
import {Items} from "./items.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {TagKey} from "../registry/tag/TagKey.ts";
import {SimpleComponentMap} from "../component/SimpleComponentMap.ts";
import type {World} from "../world/World.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {clamp} from "../utils/math/math.ts";
import type {ComponentType} from "../component/ComponentType.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Registries} from "../registry/Registries.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import type {PacketCodec} from "../network/codec/PacketCodec.ts";
import type {BinaryWriter} from "../nbt/BinaryWriter.ts";
import type {BinaryReader} from "../nbt/BinaryReader.ts";
import {ComponentChanges} from "../component/ComponentChanges.ts";
import {ComponentMapImpl} from "../component/ComponentMapImpl.ts";

export class ItemStack {
    public static readonly ITEM_PACKET_CODEC = PacketCodecs.registryEntry(Registries.ITEM);
    public static readonly PACKET_CODEC: PacketCodec<ItemStack> = {
        encode(writer: BinaryWriter, itemStack: ItemStack): Uint8Array {
            if (itemStack.isEmpty()) {
                writer.writeVarUInt(0);
            } else {
                writer.writeVarUInt(itemStack.getCount());
                ItemStack.ITEM_PACKET_CODEC.encode(writer, itemStack.getRegistryEntry().getValue());
                ComponentChanges.PACKET_CODEC.encode(writer, itemStack.components.getChanges());
            }
            return writer.toUint8Array();
        },
        decode(reader: BinaryReader): ItemStack {
            const count = reader.readVarUInt();
            if (count <= 0) {
                return ItemStack.EMPTY;
            }
            const item = ItemStack.ITEM_PACKET_CODEC.decode(reader);
            const componentChanges = ComponentChanges.PACKET_CODEC.decode(reader);
            return new ItemStack(item, count, ComponentMapImpl.create(item.getComponents(), componentChanges));
        }
    };
    public static readonly LIST_PACKET_CODEC = PacketCodecs.collectionSet(this.PACKET_CODEC);


    // @ts-ignore
    public static readonly EMPTY = new ItemStack(null, 0, SimpleComponentMap.EMPTY);

    private readonly item: Item | null;
    private readonly components: ComponentMapImpl;
    private count: number;
    private holder: Entity | null = null;

    public constructor(item: Item, count: number = 1, components: ComponentMapImpl | ComponentChanges | null = null) {
        this.item = item;
        if (!components) {
            this.components = new ComponentMapImpl(item.getComponents());
        } else if (components instanceof ComponentChanges) {
            this.components = ComponentMapImpl.create(item.getComponents(), components);
        } else {
            this.components = components;
        }
        this.count = count;
    }

    public static areItemsAndComponentsEqual(stack: ItemStack, other: ItemStack): boolean {
        if (!stack.isOf(other.getItem())) {
            return false;
        }
        return stack.isEmpty() && other.isEmpty() ? true : stack.components.equals(other.components);
    }

    public static readNBT(nbt: NbtCompound): ItemStack | null {
        const typeName = nbt.getString('type');
        const id = Identifier.tryParse(typeName);
        if (!id) return null;

        const type = Registries.ITEM.getEntryById(id);
        if (!type) return null;

        const counts = nbt.getByte('counts');

        let compounds: ComponentMapImpl | null = null;
        const compoundsNbt = nbt.getCompound('compounds');
        if (compoundsNbt) compounds = ComponentMapImpl.fromNbt(compoundsNbt);

        return new ItemStack(type.getValue(), counts, compounds);
    }

    public isEmpty(): boolean {
        return this === ItemStack.EMPTY || this.item === Items.AIR || this.count <= 0;
    }

    public split(amount: number): ItemStack {
        const i = Math.min(amount, this.getCount());
        const itemStack = this.copyWithCount(i);
        this.decrement(i);
        return itemStack;
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

    public applyChanges(changes: ComponentChanges): void {
        this.components.applyChanges(changes);
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

    public contains<T>(type: ComponentType<T>): boolean {
        return this.getComponents().contains(type);
    }

    public rightClick(world: World, user: PlayerEntity) {
        this.getItem().rightClick(world, user);
    }

    public leftClick(world: World, user: PlayerEntity) {
        this.getItem().leftClick(world, user);
    }

    public isAvailable(): boolean {
        return this.getOrDefault(DataComponentTypes.ITEM_AVAILABLE, true);
    }

    public setAvailable(value: boolean): void {
        this.set(DataComponentTypes.ITEM_AVAILABLE, value);
    }

    public isDamageable() {
        return this.has(DataComponentTypes.MAX_DURABILITY) && !this.has(DataComponentTypes.UNBREAKABLE) && this.has(DataComponentTypes.DURABILITY);
    }

    public isDamaged() {
        return this.isDamageable() && this.getDamage() > 0;
    }

    public getDamage(): number {
        return clamp(this.components.getOrDefault(DataComponentTypes.DURABILITY, 0), 0, this.getMaxDamage());
    }

    public setDamage(damage: number) {
        this.components.set(DataComponentTypes.DURABILITY, clamp(damage, 0, this.getMaxCount()));
    }

    public getMaxDamage(): number {
        return this.components.getOrDefault(DataComponentTypes.MAX_DURABILITY, 0);
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

    public copyWithCount(count: number): ItemStack {
        if (this.isEmpty()) {
            return ItemStack.EMPTY;
        } else {
            const itemStack = this.copy();
            itemStack.setCount(count);
            return itemStack;
        }
    }

    public toString(): string {
        return `${this.getCount()} ${this.getItem()}`
    }

    public inventoryTick(world: World, entity: Entity, slot: number, selected: boolean): void {
        if (this.getItem() !== null) {
            this.getItem().inventoryTick(this, world, entity, slot, selected);
        }
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

    public isStackable(): boolean {
        return this.getMaxCount() > 1 && (!this.isDamageable() || !this.isDamaged());
    }

    public increment(amount: number) {
        this.setCount(this.getCount() + amount);
    }

    public decrement(amount: number): void {
        this.increment(-amount);
    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();
        nbt.putString('type', this.getItem().getRegistryEntry().getRegistryKey().getValue().toString());
        nbt.putByte('counts', this.getCount());
        nbt.putCompound('compounds', this.components.toNbt());

        return nbt
    }
}