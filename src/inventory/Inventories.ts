import {ItemStack} from "../item/ItemStack.ts";
import type {DefaultedList} from "../utils/collection/DefaultedList.ts";

export class Inventories {
    public static splitStack(stacks: DefaultedList<ItemStack>, slot: number, amount: number) {
        return slot >= 0 && slot < stacks.length && !stacks.get(slot).isEmpty() && amount > 0
            ? stacks.get(slot).split(amount)
            : ItemStack.EMPTY;
    }
}