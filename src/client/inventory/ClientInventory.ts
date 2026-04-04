import type {UniqueInventory} from "../../entity/player/UniqueInventory.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {PlayerInventorySwapC2SPacket} from "../../network/packet/c2s/PlayerInventorySwapC2SPacket.ts";

export class ClientInventory {
    public isOpen = false;
    public justClicked = false;

    private readonly player: ClientPlayerEntity;
    private readonly inventory: UniqueInventory;

    private heldItem: ItemStack = ItemStack.EMPTY;
    private heldFromSlot: number = -1;

    public constructor(player: ClientPlayerEntity) {
        this.player = player;
        this.inventory = player.getInventory();
    }

    public getHeldItem(): ItemStack {
        return this.heldItem;
    }

    public getInventory() {
        return this.inventory;
    }

    public interactWithSlot(slot: number): void {
        this.justClicked = false;
        const targetSlot = this.inventory.getItem(slot);

        if (this.player.input.wasPressed('ShiftLeft')) {
            const hotbar = this.inventory.hotbarLength();
            const index = this.inventory.getEmptySlot(slot < hotbar ? hotbar : 0);
            if (index === -1) return;
            this.sendChange(slot, index, this.inventory.getItem(slot));
            return;
        }

        if (this.heldItem.isEmpty()) {
            if (targetSlot.isEmpty()) return;

            this.heldItem = targetSlot.copy();
            this.heldFromSlot = slot;
            this.inventory.removeItem(slot);
            return;
        }

        this.sendChange(this.heldFromSlot, slot, this.heldItem);
        this.clearHeldItem();
    }

    private sendChange(from: number, to: number, item: ItemStack): void {
        this.inventory.removeItem(from);
        this.inventory.setItem(to, item);
        this.player.getNetworkChannel().send(new PlayerInventorySwapC2SPacket(from, to));
    }

    public cancelInteraction(): void {
        if (!this.heldItem.isEmpty() && this.heldFromSlot >= 0) {
            const existsStack = this.inventory.getItem(this.heldFromSlot);
            if (existsStack.isEmpty()) {
                this.inventory.setItem(this.heldFromSlot, this.heldItem);
            } else {
                const index = this.inventory.getEmptySlot();
                if (index >= 0) this.inventory.setItem(index, this.heldItem);
            }

            this.clearHeldItem();
        }
    }

    private clearHeldItem(): void {
        this.heldItem = ItemStack.EMPTY;
        this.heldFromSlot = -1;
    }

    public reset(): void {
        this.cancelInteraction();
    }
}