import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {GuiMouseButton, type GuiText, textOf} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";
import {clamp} from "../../../utils/math/math.ts";

/**
 * 可选择列表(带滚动条)。
 *  - 点击选择行,方向键上下移动(自动滚到可见区域),Enter 触发激活;
 *  - 内容超出可视区时出现可拖拽滚动条,悬停 / 聚焦时也可滚轮;
 *  - width 为 0 时使用默认宽度,height 为 0 时按行数自适应。
 */
export class GuiList extends GuiNode {
    private items: GuiText[] = [];
    private rowHeight = 26;
    private selected = -1;
    private scroll = 0;
    private hoverRow = -1;
    private draggingThumb = false;
    private dragStartY = 0;
    private dragScrollStart = 0;
    private onSelect: Consumer<number> | null = null;
    private onActivate: Consumer<number> | null = null;

    private readonly rowPadX = 10;

    public constructor(items: GuiText[] = []) {
        super();
        this.items = items;
        this.focusable = true;
    }

    public setItems(items: GuiText[]): this {
        this.items = items;
        this.selected = clamp(this.selected, -1, this.items.length - 1);
        this.scroll = 0;
        this.markLayoutDirty();
        return this;
    }

    public getItemCount(): number {
        return this.items.length;
    }

    public getSelected(): number {
        return this.selected;
    }

    public setRowHeight(height: number): this {
        this.rowHeight = Math.max(12, height);
        this.markLayoutDirty();
        return this;
    }

    public setSelected(index: number, notify: boolean = false): this {
        const next = clamp(index, -1, this.items.length - 1);
        if (this.selected === next) return this;
        this.selected = next;
        this.ensureVisible(next);
        this.markPaintDirty();
        if (notify) this.onSelect?.(this.selected);
        return this;
    }

    public onSelected(callback: Consumer<number>): this {
        this.onSelect = callback;
        return this;
    }

    public onActivated(callback: Consumer<number>): this {
        this.onActivate = callback;
        return this;
    }

    public override measure(_ctx: CanvasRenderingContext2D): void {
        if (this.width === 0) this.width = 240;
        if (this.height === 0) this.autoHeight = true;
        if (this.autoHeight) this.height = this.items.length * this.rowHeight + 2;
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.enabled || !this.visible || event.button !== GuiMouseButton.LEFT) return null;
        if (!this.containsPoint(event.offsetX, event.offsetY)) return null;

        // 优先命中滚动条把手
        if (this.maxScroll() > 0 && this.isInThumb(event.offsetX, event.offsetY)) {
            this.draggingThumb = true;
            this.dragStartY = event.offsetY;
            this.dragScrollStart = this.scroll;
            return this;
        }

        const row = this.rowAt(event.offsetY);
        if (row >= 0) {
            this.setSelected(row, true);
        }
        return this;
    }

    public override pointerMove(event: PointerEvent): void {
        if (this.draggingThumb) {
            this.scroll = this.dragScrollStart + (event.offsetY - this.dragStartY) * this.scrollFactor();
            this.scroll = clamp(this.scroll, 0, this.maxScroll());
            this.markPaintDirty();
            return;
        }

        const row = this.rowAt(event.offsetY);
        if (row === this.hoverRow) return;
        this.hoverRow = row;
        this.markPaintDirty();
    }

    public override pointerUp(_event: PointerEvent): void {
        this.draggingThumb = false;
    }

    public override pointerCancel(): void {
        this.draggingThumb = false;
    }

    public override wheel(event: WheelEvent): boolean {
        if (!this.enabled || !this.containsPoint(event.offsetX, event.offsetY)) return false;
        this.scrollBy(event.deltaY);
        return true;
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (!this.enabled || !this.focused || this.items.length === 0) return false;

        switch (event.code) {
            case "ArrowUp":
                this.setSelected(this.selected <= 0 ? 0 : this.selected - 1, true);
                return true;
            case "ArrowDown":
                this.setSelected(
                    this.selected < 0 ? 0 : Math.min(this.items.length - 1, this.selected + 1),
                    true
                );
                return true;
            case "Home":
                this.setSelected(0, true);
                return true;
            case "End":
                this.setSelected(this.items.length - 1, true);
                return true;
            case "Enter":
                if (this.selected >= 0) this.onActivate?.(this.selected);
                return true;
            default:
                return false;
        }
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const font = GuiTheme.font(13);
        const viewH = Math.max(0, this.height);
        const maxScroll = this.maxScroll();

        ctx.save();

        // 背景
        ctx.fillStyle = "rgba(255,255,255,0.04)";
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, 0, this.width, this.height, GuiTheme.radius);
        ctx.fill();

        // 行内容裁剪(右侧为滚动条预留空间)
        const textEndX = maxScroll > 0 ? this.width - 12 : this.width - 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(1, 1, Math.max(0, textEndX - 1), viewH - 2);
        ctx.clip();

        // 可视行区间
        const startRow = Math.max(0, Math.floor(this.scroll / this.rowHeight));
        const endRow = Math.min(this.items.length, Math.ceil((this.scroll + viewH) / this.rowHeight));

        for (let i = startRow; i < endRow; i++) {
            const y = i * this.rowHeight - this.scroll;

            if (i === this.selected) {
                ctx.fillStyle = GuiTheme.colors.accent;
                ctx.fillRect(0, y, this.width, this.rowHeight);
            } else if (i === this.hoverRow && this.enabled) {
                ctx.fillStyle = GuiTheme.colors.hover;
                ctx.fillRect(0, y, this.width, this.rowHeight);
            }

            const color = i === this.selected ? "#06131f" : GuiTheme.colors.text;
            GuiDraw.text(
                ctx,
                this.rowPadX,
                y + this.rowHeight / 2,
                textOf(this.items[i]),
                font,
                this.enabled ? color : GuiTheme.colors.textMuted,
                undefined,
                'middle'
            );
        }
        ctx.restore();

        // 滚动条
        if (maxScroll > 0) {
            const barX = this.width - 8;
            const viewPort = viewH;
            const thumbH = Math.max(20, viewPort * (viewPort / (this.items.length * this.rowHeight)));
            const thumbY = this.scroll / maxScroll * (viewPort - thumbH);

            ctx.fillStyle = "rgba(255,255,255,0.10)";
            ctx.fillRect(barX, 0, 4, viewPort);

            ctx.fillStyle = this.hovered ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.22)";
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, barX - 1, thumbY, 6, thumbH, 3);
            ctx.fill();
        }

        // 焦点描边
        if (this.focused && this.enabled) {
            ctx.strokeStyle = GuiTheme.colors.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, 0.5, 0.5, this.width - 1, this.height - 1, GuiTheme.radius);
            ctx.stroke();
        }
        ctx.restore();
    }

    private contentHeight(): number {
        return this.items.length * this.rowHeight;
    }

    private maxScroll(): number {
        return Math.max(0, this.contentHeight() - this.height);
    }

    /** 拖动 1px 对应的滚动量(保证把手跟手) */
    private scrollFactor(): number {
        const viewPort = this.height;
        const maxScroll = this.maxScroll();
        const thumbH = Math.max(20, viewPort * (viewPort / this.contentHeight()));
        const track = viewPort - thumbH;
        return track > 0 ? maxScroll / track : 0;
    }

    private scrollBy(deltaY: number): void {
        this.scroll = clamp(this.scroll + deltaY, 0, this.maxScroll());
        this.markPaintDirty();
    }

    private rowAt(absoluteY: number): number {
        const y = absoluteY - this.absY + this.scroll;
        const row = Math.floor(y / this.rowHeight);
        if (row < 0 || row >= this.items.length) return -1;
        if (y - row * this.rowHeight > this.rowHeight) return -1;
        return row;
    }

    private isInThumb(px: number, py: number): boolean {
        const maxScroll = this.maxScroll();
        if (maxScroll <= 0) return false;

        const barX = this.width - 8;
        if (px < this.absX + barX - 2 || px > this.absX + this.width) return false;

        const thumbH = Math.max(20, this.height * (this.height / this.contentHeight()));
        const thumbY = this.scroll / maxScroll * (this.height - thumbH);
        return py >= this.absY + thumbY && py <= this.absY + thumbY + thumbH;
    }

    private ensureVisible(index: number): void {
        if (index < 0 || this.height <= 0) return;

        const top = index * this.rowHeight;
        const bottom = top + this.rowHeight;
        if (top < this.scroll) {
            this.scroll = top;
        } else if (bottom > this.scroll + this.height) {
            this.scroll = bottom - this.height;
        }
        this.scroll = clamp(this.scroll, 0, this.maxScroll());
    }
}
