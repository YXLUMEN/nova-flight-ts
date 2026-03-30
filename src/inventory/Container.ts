import type {ItemStack} from "../item/ItemStack.ts";
import type {Item} from "../item/Item.ts";

export interface Container {
    size(): number;

    isEmpty(): boolean;

    getItem(slot: number): ItemStack;

    removeItem(slot: number, amount?: number): ItemStack;

    removeItemNoUpdate(slot: number): ItemStack;

    setItem(slot: number, stack: ItemStack): void;

    getMaxStackSize(): number;

    setChanged(): void;

    countItem(item: Item): number;

    containsAny(items: Set<Item>): boolean;

    clearContent(): void;
}