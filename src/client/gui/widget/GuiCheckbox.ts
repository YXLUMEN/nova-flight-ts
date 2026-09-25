import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {type GuiCheckboxKind, GuiMouseButton, type GuiText, textOf} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";

/**
 * 复选 / 开关控件。
 * 点击整行或按 Space 均可切换;width 为 0 时自动按标签宽度扩展。
 */
export class GuiCheckbox extends GuiNode {
    private label: GuiText;
    private kind: GuiCheckboxKind = "box";
    private checked = false;
    private onChange: Consumer<boolean> | null = null;
    private pressed = false;

    public constructor(label: GuiText, checked: boolean = false) {
        super();
        this.label = label;
        this.checked = checked;
        this.focusable = true;
    }

    public setLabel(label: GuiText): this {
        this.label = label;
        this.markLayoutDirty();
        return this;
    }

    public setKind(kind: GuiCheckboxKind): this {
        this.kind = kind;
        this.markPaintDirty();
        return this;
    }

    public setChecked(checked: boolean, notify: boolean = false): this {
        if (this.checked === checked) return this;
        this.checked = checked;
        this.markPaintDirty();
        if (notify) this.onChange?.(this.checked);
        return this;
    }

    public isChecked(): boolean {
        return this.checked;
    }

    public onChanged(callback: Consumer<boolean>): this {
        this.onChange = callback;
        return this;
    }

    public override measure(): void {
        if (this.width === 0) this.autoWidth = true;
        if (this.height === 0) this.autoHeight = true;

        if (this.autoHeight) {
            this.height = GuiTheme.controlHeight;
        }
        if (this.autoWidth) {
            const font = GuiTheme.defaultFont;
            this.width = this.controlWidth() + 10 + Math.ceil(GuiDraw.measure(textOf(this.label), font));
        }
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.enabled || !this.visible || event.button !== GuiMouseButton.LEFT) return null;
        if (!this.containsPoint(event.offsetX, event.offsetY)) return null;

        this.pressed = true;
        return this;
    }

    public override pointerUp(event: PointerEvent): void {
        const wasPressed = this.pressed;
        this.pressed = false;

        if (wasPressed && this.enabled && this.containsPoint(event.offsetX, event.offsetY)) {
            this.toggle();
        }
    }

    public override pointerCancel(): void {
        this.pressed = false;
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (!this.enabled || !this.focused || event.code !== "Space") return false;
        this.toggle();
        return true;
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const size = this.controlSize();
        const y = (this.height - size) / 2;

        ctx.save();
        ctx.globalAlpha = this.enabled ? 1 : 0.45;

        if (this.kind === "switch") {
            this.renderSwitch(ctx, y, size);
        } else {
            this.renderBox(ctx, y, size);
        }

        const font = GuiTheme.defaultFont;
        GuiDraw.text(
            ctx,
            this.controlWidth() + 10,
            this.height / 2,
            textOf(this.label),
            font,
            this.enabled ? GuiTheme.colors.text : GuiTheme.colors.textMuted,
            undefined,
            'middle'
        );
        ctx.restore();
    }

    private toggle(): void {
        this.checked = !this.checked;
        this.markPaintDirty();
        this.onChange?.(this.checked);
    }

    private renderBox(ctx: CanvasRenderingContext2D, y: number, size: number): void {
        ctx.fillStyle = this.checked ? GuiTheme.colors.accent : "rgba(255,255,255,0.06)";
        ctx.strokeStyle = this.checked ? GuiTheme.colors.accent : GuiTheme.colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, y, size, size, 4);
        ctx.fill();
        ctx.stroke();

        if (this.checked) {
            ctx.strokeStyle = "#06131f";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(4, y + size * 0.55);
            ctx.lineTo(size * 0.4, y + size * 0.8);
            ctx.lineTo(size - 3, y + size * 0.25);
            ctx.stroke();
        }

        if (this.focused && this.enabled) {
            ctx.strokeStyle = GuiTheme.colors.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, -2, y - 2, size + 4, size + 4, 6);
            ctx.stroke();
        }
    }

    private renderSwitch(ctx: CanvasRenderingContext2D, y: number, size: number): void {
        const trackW = size * 1.7;
        const knobSize = size - 6;
        const knobX = this.checked ? trackW - knobSize - 3 : 3;

        ctx.fillStyle = this.checked ? "rgba(94,200,255,0.55)" : "rgba(255,255,255,0.10)";
        ctx.strokeStyle = this.checked ? GuiTheme.colors.accent : GuiTheme.colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, y, trackW, size, size / 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.checked ? "#ffffff" : "#9aa7b8";
        ctx.beginPath();
        ctx.arc(knobX + knobSize / 2, y + size / 2, knobSize / 2, 0, Math.PI * 2);
        ctx.fill();

        if (this.focused && this.enabled) {
            ctx.strokeStyle = GuiTheme.colors.accent;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, -2, y - 2, trackW + 4, size + 4, size / 2 + 2);
            ctx.stroke();
        }
    }

    private controlSize(): number {
        return Math.max(16, Math.min(22, this.height > 0 ? this.height - 10 : 18));
    }

    private controlWidth(): number {
        const size = this.controlSize();
        return this.kind === "switch" ? size * 1.7 : size;
    }
}
