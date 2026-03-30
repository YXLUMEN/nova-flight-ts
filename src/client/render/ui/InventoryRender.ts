import type {IUi} from "./IUi.ts";
import type {ClientPlayerEntity} from "../../entity/ClientPlayerEntity.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";

export class InventoryRender implements IUi {
    private readonly player: ClientPlayerEntity;
    private width: number = 0;
    private height: number = 0;

    private readonly SLOT_SIZE = 46;
    private readonly SLOT_PADDING = 6;
    private readonly HOTBAR_MARGIN_BOTTOM = 20;
    private readonly INVENTORY_GRID_COLS = 6;

    public constructor(player: ClientPlayerEntity) {
        this.player = player;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        if (!this.player.openInventory) return;

        const inventory = this.player.getInventory();
        const hotbarLen = inventory.hotbarLength();
        const totalSize = inventory.maxSize();

        const backpackSize = Math.max(0, totalSize - hotbarLen);
        const rows = Math.ceil(backpackSize / this.INVENTORY_GRID_COLS);
        const gridWidth = this.INVENTORY_GRID_COLS * (this.SLOT_SIZE + this.SLOT_PADDING) - this.SLOT_PADDING;
        const gridHeight = rows * (this.SLOT_SIZE + this.SLOT_PADDING) - this.SLOT_PADDING;

        const startX = (this.width - gridWidth) / 2;
        const startY = (this.height - gridHeight) / 2 - 60;

        const hotbarStartX = (this.width - hotbarLen * (this.SLOT_SIZE + this.SLOT_PADDING) + this.SLOT_PADDING) / 2;
        const hotbarY = this.height - this.HOTBAR_MARGIN_BOTTOM - this.SLOT_SIZE;

        ctx.save();
        ctx.textAlign = "center";
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(0, 0, this.width, this.height);

        for (let i = 0; i < totalSize; i++) {
            if (i < hotbarLen) {
                const x = hotbarStartX + i * (this.SLOT_SIZE + this.SLOT_PADDING);
                this.drawSlot(ctx, x, hotbarY, inventory.getItem(i), inventory.getSelectedSlot() === i);
            } else {
                const backpackIndex = i - hotbarLen;
                const row = Math.floor(backpackIndex / this.INVENTORY_GRID_COLS);
                const col = backpackIndex % this.INVENTORY_GRID_COLS;
                const x = startX + col * (this.SLOT_SIZE + this.SLOT_PADDING);
                const y = startY + row * (this.SLOT_SIZE + this.SLOT_PADDING);
                this.drawSlot(ctx, x, y, inventory.getItem(i), false);
            }
        }
        ctx.restore();
    }

    private drawSlot(ctx: CanvasRenderingContext2D, x: number, y: number, item: ItemStack, selected: boolean): void {
        ctx.fillStyle = '#222';
        ctx.fillRect(x, y, this.SLOT_SIZE, this.SLOT_SIZE);

        if (selected) {
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 3;
        } else {
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
        }
        ctx.strokeRect(x, y, this.SLOT_SIZE, this.SLOT_SIZE);

        if (!item.isEmpty()) {
            ctx.fillStyle = '#4a80ff';
            ctx.fillText(item.getItem().getName().toString(), x, y);
            // ctx.fillRect(x + 4, y + 4, this.SLOT_SIZE - 8, this.SLOT_SIZE - 8);
        }
    }

    public setSize(w: number, h: number): void {
        this.width = w;
        this.height = h;
    }

    public destroy(): void {
    }
}