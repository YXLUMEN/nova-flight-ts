import type {Container} from "../../inventory/Container.ts";
import type {Item} from "../../item/Item.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import type {PlayerEntity} from "./PlayerEntity.ts";
import {clamp} from "../../utils/math/math.ts";
import type {NbtSerializable} from "../../nbt/NbtSerializable.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {DefaultedList} from "../../utils/collection/DefaultedList.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";

export class UniqueInventory implements Container, NbtSerializable, Iterable<ItemStack> {
    public readonly player: PlayerEntity;

    private readonly inventory = DefaultedList.ofSizeAndValue(24, ItemStack.EMPTY);
    private readonly items = new Map<Item, ItemStack>();

    private selected: number = 0;

    private timesChanged: number = 0;

    public constructor(player: PlayerEntity) {
        this.player = player;
    }

    public tick() {
        const world = this.player.getWorld();
        for (let i = 0; i < this.inventory.length; i++) {
            const stack = this.inventory.get(i);
            if (!stack.isEmpty()) {
                stack.inventoryTick(world, this.player, i, this.selected === i);
            }
        }
    }

    public getSelectedSlot(): number {
        return this.selected;
    }

    public setSelectedSlot(selected: number): void {
        this.selected = clamp(selected, 0, this.hotbarLength() - 1);
    }

    public getSelectedItem(): ItemStack {
        return this.inventory.get(this.selected);
    }

    public setSelectedItem(stack: ItemStack): void {
        this.inventory.set(this.selected, stack);
    }

    public getEmptySlot(min: number = 0, max: number = this.inventory.length): number {
        min = clamp(min, 0, this.inventory.length)
        max = clamp(max, min, this.inventory.length);

        for (let i = min; i < max; i++) {
            if (this.inventory.get(i).isEmpty()) {
                return i;
            }
        }
        return -1;
    }

    public size(): number {
        return this.items.size;
    }

    public maxSize(): number {
        return this.inventory.length;
    }

    public isEmpty(): boolean {
        return this.items.size === 0;
    }

    public getItem(slot: number): ItemStack {
        return this.inventory.get(slot) ?? ItemStack.EMPTY;
    }

    public searchItem(item: Item): ItemStack {
        return this.items.get(item) ?? ItemStack.EMPTY;
    }

    public removeItem(slot: number): ItemStack {
        return this.removeItemNoUpdate(slot);
    }

    public removeItemNoUpdate(slot: number): ItemStack {
        const stack = this.inventory.get(slot);
        if (stack) {
            this.inventory.set(slot, ItemStack.EMPTY);
            this.items.delete(stack.getItem());
            return stack;
        }

        return ItemStack.EMPTY;
    }

    public removeInventoryItem(item: Item): ItemStack {
        const stack = this.items.get(item);
        if (!stack) return ItemStack.EMPTY;

        const index = this.inventory.indexOf(stack);
        if (index >= 0) {
            this.inventory.set(index, ItemStack.EMPTY);
            this.setSelectedSlot(index - 1);
        }

        this.items.delete(item);
        return stack;
    }

    public setItem(slot: number, stack: ItemStack): void {
        if (slot < 0 || slot >= this.inventory.length || this.canNotAdd(stack)) return;

        this.inventory.set(slot, stack);
        this.items.set(stack.getItem(), stack);
    }

    public addItem(stack: ItemStack): boolean {
        if (this.canNotAdd(stack)) return false;
        const index = this.getEmptySlot();
        if (index === -1) return false;

        this.inventory.set(index, stack);
        this.items.set(stack.getItem(), stack);
        return true;
    }

    public countItem(item: Item): number {
        return this.items.has(item) ? 1 : 0;
    }

    public hasItem(item: Item): boolean {
        return this.items.has(item);
    }

    public containsAny(items: Set<Item>): boolean {
        return items.values().some(item => this.items.has(item));
    }

    public clearContent() {
        this.selected = 0;
        this.inventory.clear();
        this.items.clear();
    }

    public getMaxStackSize(): number {
        return 32;
    }

    public hotbarLength(): number {
        return 6;
    }

    public setChanged(): void {
        this.timesChanged++;
    }

    public getChangeTimes(): number {
        return this.timesChanged;
    }

    private canNotAdd(stack: ItemStack): boolean {
        return stack.isEmpty() || this.items.has(stack.getItem());
    }

    [Symbol.iterator](): Iterator<ItemStack> {
        return this.inventory[Symbol.iterator]();
    }

    public keys() {
        return this.items.keys();
    }

    public values() {
        return this.items.values();
    }

    public readNBT(nbt: NbtCompound) {
        this.setSelectedSlot(nbt.getInt8('selected_slot'));

        const inventory = nbt.getCompoundArray('inventory');
        if (inventory.length > 0) {
            this.clearContent();
            for (const compound of inventory) {
                const slot = compound.getInt8('slot');
                if (!compound.contains('stack', NbtTypeId.Compound)) continue;

                const stack = ItemStack.CODEC.decode(compound.getCompound('stack')) ?? ItemStack.EMPTY;
                stack.setHolder(this.player);
                this.setItem(slot, stack);
            }
        }
        return nbt;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.putInt8('selected_slot', this.selected);

        const inventory: NbtCompound[] = [];
        for (let i = 0; i < this.inventory.length; i++) {
            const stack = this.inventory.get(i);
            if (stack.isEmpty()) continue;

            const compound = new NbtCompound();
            compound.putInt8('slot', i);
            compound.put('stack', ItemStack.CODEC.encode(stack));
            inventory.push(compound);
        }
        nbt.putCompoundArray('inventory', inventory);

        return nbt;
    }
}