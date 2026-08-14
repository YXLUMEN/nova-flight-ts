import type {IUi} from "../render/ui/IUi.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {ClientInventory} from "./ClientInventory.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {ModelManager} from "../render/model/ModelManager.ts";

export class InventoryRender implements IUi {
    private width: number = 0;
    private height: number = 0;

    private readonly player: ClientPlayerEntity;
    private readonly inventory: ClientInventory;

    private readonly ICON_SIZE = 38;
    private readonly SLOT_SIZE = 46;
    private readonly HASH_SLOT_SIZE = 23;
    private readonly SLOT_PADDING = 6;
    private readonly HOTBAR_MARGIN_BOTTOM = 20;
    private readonly INVENTORY_GRID_COLS = 6;

    private pointerItem: ItemStack = ItemStack.EMPTY;
    private hotbarLen: number = 0;
    private totalSize: number = 0;
    private specialLen: number = 0;
    private slotPositions: Float32Array | null = null;

    public constructor(player: ClientPlayerEntity) {
        this.player = player;
        this.inventory = player.clientInventory;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.inventory.isOpen || !this.slotPositions) return;

        const inventory = this.inventory.getInventory();
        const hotbarLen = inventory.hotbarLength();
        const specialLen = inventory.tickSlotsLen();
        const totalSize = inventory.maxSize();
        if (hotbarLen !== this.hotbarLen || totalSize !== this.totalSize) {
            this.recalculateLayout(hotbarLen, specialLen, totalSize);
        }

        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < totalSize; i++) {
            const x = this.slotPositions[i * 2];
            const y = this.slotPositions[i * 2 + 1];
            const item = inventory.getItem(i);
            const selected = inventory.getSelectedSlot() === i;
            this.renderSlot(ctx, x, y, item, selected, this.hotbarLen <= i && i < this.specialLen);
        }

        const held = this.inventory.getHeldItem();
        if (!held.isEmpty()) {
            const pointer = this.player.input.getScreenPointer();
            this.renderItem(ctx, pointer.x - this.HASH_SLOT_SIZE, pointer.y - this.HASH_SLOT_SIZE, held);
        }

        if (!this.pointerItem.isEmpty()) {
            const pointer = this.player.input.getScreenPointer();
            this.renderItemTooltip(ctx, pointer.x, pointer.y, this.pointerItem);
        }

        ctx.restore();
    }

    private renderItemTooltip(ctx: CanvasRenderingContext2D, mx: number, my: number, item: ItemStack): void {
        const mainFont = 'bold 16px Arial';
        const subFont = '12px Arial';
        const padding = 16;
        const lineGap = 4;

        const itemName = item.getItem().getName().toString();
        const namespace = item.getItem().getRegistryEntry().getRegistryKey().getValue().getNamespace();

        ctx.font = mainFont;
        const nameMetrics = ctx.measureText(itemName);
        const nameWidth = nameMetrics.width;
        const nameHeight = 16;
        ctx.font = subFont;
        const subMetrics = ctx.measureText(namespace);
        const subWidth = subMetrics.width;
        const subHeight = 12;

        const tooltipWidth = Math.max(nameWidth, subWidth) + padding * 2;
        const tooltipHeight = nameHeight + subHeight + lineGap + padding * 2;
        let x = mx + 10;
        let y = my + 10;
        if (x + tooltipWidth > this.width) {
            x = mx - tooltipWidth - 10;
        }
        if (y + tooltipHeight > this.height) {
            y = my - tooltipHeight - 10;
        }
        if (x < 0) x = 0;
        if (y < 0) y = 0;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = '#444';
        ctx.fillRect(x, y, tooltipWidth, tooltipHeight);
        ctx.strokeRect(x, y, tooltipWidth, tooltipHeight);

        ctx.font = mainFont;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(itemName, x + padding, y + padding);

        ctx.font = subFont;
        ctx.fillStyle = '#aaa';
        ctx.fillText(namespace, x + padding, y + padding + nameHeight + lineGap);
    }

    private renderSlot(ctx: CanvasRenderingContext2D, x: number, y: number, item: ItemStack, selected: boolean, isSpecialSlot: boolean): void {
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, this.SLOT_SIZE, this.SLOT_SIZE);

        if (selected) {
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
        } else if (isSpecialSlot) {
            ctx.strokeStyle = '#D4AF37';
            ctx.lineWidth = 2;
        } else {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(x, y, this.SLOT_SIZE, this.SLOT_SIZE);

        if (item.isEmpty()) return;
        this.renderItem(ctx, x, y, item);
    }

    private renderItem(ctx: CanvasRenderingContext2D, x: number, y: number, item: ItemStack): void {
        const model = ModelManager.getItemModel(item.getItem());
        ctx.drawImage(model.getLayer0(), x + 4, y + 4, this.ICON_SIZE, this.ICON_SIZE);
    }

    private recalculateLayout(hotbarLen: number, specialLen: number, totalSize: number): void {
        this.hotbarLen = hotbarLen;
        this.specialLen = specialLen;
        this.totalSize = totalSize;

        const backpackSize = Math.max(0, totalSize - hotbarLen);
        const rows = Math.ceil(backpackSize / this.INVENTORY_GRID_COLS);
        const gridWidth = this.INVENTORY_GRID_COLS * (this.SLOT_SIZE + this.SLOT_PADDING) - this.SLOT_PADDING;
        const gridHeight = rows * (this.SLOT_SIZE + this.SLOT_PADDING) - this.SLOT_PADDING;

        const startX = (this.width - gridWidth) / 2;
        const startY = (this.height - gridHeight) / 2 - 60;

        const hotbarStartX = (this.width - hotbarLen * (this.SLOT_SIZE + this.SLOT_PADDING) + this.SLOT_PADDING) / 2;

        if (this.slotPositions === null || this.slotPositions.length !== totalSize * 2) {
            this.slotPositions = new Float32Array(totalSize * 2);
        }

        for (let i = 0; i < totalSize; i++) {
            let x: number, y: number;
            if (i < hotbarLen) {
                x = hotbarStartX + i * (this.SLOT_SIZE + this.SLOT_PADDING);
                y = this.height - this.HOTBAR_MARGIN_BOTTOM - this.SLOT_SIZE;
            } else {
                const idx = i - hotbarLen;
                const row = Math.floor(idx / this.INVENTORY_GRID_COLS);
                const col = idx % this.INVENTORY_GRID_COLS;
                x = startX + col * (this.SLOT_SIZE + this.SLOT_PADDING);
                y = startY + row * (this.SLOT_SIZE + this.SLOT_PADDING);
            }
            this.slotPositions[i * 2] = x;
            this.slotPositions[i * 2 + 1] = y;
        }
    }

    private getSlotAt(x: number, y: number): number | null {
        if (this.slotPositions === null) return null;

        for (let i = 0; i < this.totalSize; i++) {
            const slotX = this.slotPositions[i * 2];
            const slotY = this.slotPositions[i * 2 + 1];

            if (
                x >= slotX &&
                x <= slotX + this.SLOT_SIZE &&
                y >= slotY &&
                y <= slotY + this.SLOT_SIZE
            ) {
                return i;
            }
        }
        return null;
    }

    public tick(): void {
        if (!this.inventory.isOpen) return

        const pointer = this.player.input.getScreenPointer();
        const slot = this.getSlotAt(pointer.x, pointer.y);
        if (slot === null) {
            this.inventory.justClicked = false;
            this.pointerItem = ItemStack.EMPTY;
            return;
        }

        if (this.inventory.justClicked) {
            this.inventory.interactWithSlot(slot);
        } else {
            this.pointerItem = this.inventory.getInventory().getItem(slot);
        }
    }

    public setSize(w: number, h: number): void {
        this.width = w;
        this.height = h;

        const inventory = this.inventory.getInventory();
        this.recalculateLayout(inventory.hotbarLength(), inventory.tickSlotsLen(), inventory.maxSize());
    }

    public destroy(): void {
        this.slotPositions = null;
    }
}