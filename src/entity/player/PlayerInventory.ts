import type {Inventory} from "../../inventory/Inventory.ts";
import {type PlayerEntity} from "./PlayerEntity.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {DefaultedList} from "../../utils/collection/DefaultedList.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import type {Item} from "../../item/Item.ts";
import {Inventories} from "../../inventory/Inventories.ts";

export class PlayerInventory implements Inventory {
    public readonly main = DefaultedList.ofSizeAndValue(36, ItemStack.EMPTY);
    public readonly refit = DefaultedList.ofSizeAndValue(6, ItemStack.EMPTY);
    private readonly combinedInventory: ReadonlyArray<DefaultedList<ItemStack>> = [this.main, this.refit];

    public selectedSlot: number = 0;
    public readonly player: PlayerEntity;
    private changeCount: number = 0;

    public constructor(player: PlayerEntity) {
        this.player = player;
    }

    public getCurrentStack(): ItemStack {
        return PlayerInventory.isValidHotbarIndex(this.selectedSlot) ? this.main.get(this.selectedSlot) : ItemStack.EMPTY;
    }

    public static getHotBarSize() {
        return 9;
    }

    public static isValidHotbarIndex(slot: number): boolean {
        return slot >= 0 && slot < 9;
    }

    // private canStackAddMore(existingStack: ItemStack, stack: ItemStack): boolean {
    //     return !existingStack.isEmpty() &&
    //         ItemStack.areItemsAndComponentsEqual(existingStack, stack) &&
    //         existingStack.isStackable() &&
    //         existingStack.getCount() < this.getMaxCount(existingStack);
    // }

    public getEmptySlot(): number {
        for (let i = 0; i < this.main.length; i++) {
            if (this.main.get(i).isEmpty()) {
                return i;
            }
        }

        return -1;
    }

    public getSlotWithStack(stack: ItemStack): number {
        for (let i = 0; i < this.main.length; i++) {
            if (!this.main.get(i).isEmpty() && ItemStack.areItemsAndComponentsEqual(stack, this.main.get(i))) {
                return i;
            }
        }

        return -1;
    }

    public indexOf(stack: ItemStack) {
        for (let i = 0; i < this.main.length; i++) {
            const itemStack = this.main.get(i);
            if (!itemStack.isEmpty()
                && ItemStack.areItemsAndComponentsEqual(stack, itemStack)
                && !itemStack.isDamaged()
                && !itemStack.contains(DataComponentTypes.CUSTOM_NAME)) {
                return i;
            }
        }

        return -1;
    }

    public updateItems(): void {
        for (const defaultList of this.combinedInventory) {
            for (let i = 0; i < defaultList.length; i++) {
                if (defaultList.get(i).isEmpty()) continue;
                defaultList.get(i).inventoryTick(this.player.getWorld(), this.player, i, this.selectedSlot === i);
            }
        }
    }

    public containsAny(): boolean {
        return false;
    }

    public count(item: Item): number {
        let i = 0;

        for (let j = 0; j < this.length(); j++) {
            const itemStack = this.getStack(j);
            if (itemStack.getItem() === item) {
                i += itemStack.getCount();
            }
        }

        return i;
    }

    public getMaxCountPerStack(): number {
        return 99;
    }

    public getMaxCount(stack: ItemStack): number {
        return Math.min(this.getMaxCountPerStack(), stack.getMaxCount());
    }

    public getStack(slot: number): ItemStack {
        let list: DefaultedList<ItemStack> | null = null;

        for (const defaultList of this.combinedInventory) {
            if (slot < defaultList.length) {
                list = defaultList;
                break;
            }
            slot -= defaultList.length;
        }

        return list === null ? ItemStack.EMPTY : list.get(slot);
    }

    public isEmpty(): boolean {
        for (const itemStack of this.main) {
            if (!itemStack.isEmpty()) {
                return false;
            }
        }

        for (const itemStack of this.refit) {
            if (!itemStack.isEmpty()) {
                return false;
            }
        }

        return true;
    }

    public markDirty(): void {
        this.changeCount++;
    }

    public getChangeCount(): number {
        return this.changeCount;
    }

    public removeStack(slot: number, amount: number = 1): ItemStack {
        let list: DefaultedList<ItemStack> | null = null;

        for (const defaultList of this.combinedInventory) {
            if (slot < defaultList.length) {
                list = defaultList;
                break;
            }

            slot -= defaultList.length;
        }

        return list !== null && !list.get(slot).isEmpty() ? Inventories.splitStack(list, slot, amount) : ItemStack.EMPTY;
    }

    public setStack(slot: number, stack: ItemStack): void {
        let defaultedList: DefaultedList<ItemStack> | null = null;

        for (const defaultedList2 of this.combinedInventory) {
            if (slot < defaultedList2.length) {
                defaultedList = defaultedList2;
                break;
            }

            slot -= defaultedList2.length;
        }

        if (defaultedList != null) {
            defaultedList.set(slot, stack);
        }
    }

    public length(): number {
        return this.main.length + this.refit.length;
    }
}