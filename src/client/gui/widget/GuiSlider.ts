import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {GuiMouseButton} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";
import {clamp} from "../../../utils/math/math.ts";

/**
 * 水平滑条:点击轨道跳转、拖拽把手连续调节。
 *  - 支持 step 步进与 min/max 范围;
 *  - 聚焦时可用 方向键 / Home / End 微调;悬停时可用滚轮;
 *  - width 为 0 时使用默认宽度。
 */
export class GuiSlider extends GuiNode {
    private minValue = 0;
    private maxValue = 100;
    private step = 1;
    private value = 0;
    private onChange: Consumer<number> | null = null;

    private dragging = false;

    public constructor(min: number = 0, max: number = 100, value: number = 0) {
        super();
        this.minValue = min;
        this.maxValue = max;
        this.value = clamp(value, min, max);
        this.focusable = true;
    }

    public setRange(min: number, max: number): this {
        this.minValue = min;
        this.maxValue = max;
        this.value = clamp(this.value, min, max);
        this.markPaintDirty();
        return this;
    }

    public setStep(step: number): this {
        this.step = Math.max(0.0001, step);
        return this;
    }

    public setValue(value: number, notify: boolean = false): this {
        const next = this.snap(value);
        if (next === this.value) return this;
        this.value = next;
        this.markPaintDirty();
        if (notify) this.onChange?.(this.value);
        return this;
    }

    public getValue(): number {
        return this.value;
    }

    public onChanged(callback: Consumer<number>): this {
        this.onChange = callback;
        return this;
    }

    public override measure(_ctx: CanvasRenderingContext2D): void {
        if (this.width === 0) this.width = 200;
        if (this.height === 0) this.height = 24;
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.enabled || !this.visible || event.button !== GuiMouseButton.LEFT) return null;
        if (!this.containsPoint(event.offsetX, event.offsetY)) return null;

        this.dragging = true;
        this.markPaintDirty();
        this.applyPointer(event.offsetX);
        return this;
    }

    public override pointerMove(event: PointerEvent): void {
        if (!this.dragging) return;
        this.applyPointer(event.offsetX);
    }

    public override pointerUp(_event: PointerEvent): void {
        this.endDrag();
    }

    public override pointerCancel(): void {
        this.endDrag();
    }

    public override wheel(event: WheelEvent): boolean {
        if (!this.enabled || !this.containsPoint(event.offsetX, event.offsetY)) return false;
        this.stepBy(event.deltaY > 0 ? -1 : 1);
        return true;
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (!this.enabled || !this.focused) return false;

        switch (event.code) {
            case "ArrowRight":
                this.stepBy(1);
                return true;
            case "ArrowLeft":
                this.stepBy(-1);
                return true;
            case "Home":
                this.setValue(this.minValue, true);
                return true;
            case "End":
                this.setValue(this.maxValue, true);
                return true;
            default:
                return false;
        }
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const trackY = this.height / 2;
        const knobR = Math.max(5, Math.min(7, this.height / 3));
        const ratio = this.ratio();
        const trackX0 = knobR;
        const trackX1 = this.width - knobR;
        const knobX = trackX0 + (trackX1 - trackX0) * ratio;

        ctx.save();
        ctx.globalAlpha = this.enabled ? 1 : 0.45;

        // 轨道
        ctx.fillStyle = GuiTheme.colors.track;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, trackY - 3, this.width, 6, 3);
        ctx.fill();

        // 已填充部分
        if (ratio > 0) {
            ctx.fillStyle = this.enabled ? GuiTheme.colors.accent : GuiTheme.colors.textMuted;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, 0, trackY - 3, Math.max(6, knobX), 6, 3);
            ctx.fill();
        }

        // 把手
        ctx.fillStyle = this.enabled && (this.hovered || this.dragging) ? "#ffffff" : "#d8e4f2";
        ctx.strokeStyle = this.enabled ? GuiTheme.colors.accent : GuiTheme.colors.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(knobX, trackY, this.dragging ? knobR + 1 : knobR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (this.focused && this.enabled) {
            ctx.strokeStyle = GuiTheme.colors.accent;
            ctx.lineWidth = 1;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, 1, 1, this.width - 2, this.height - 2, GuiTheme.radius);
            ctx.stroke();
        }
        ctx.restore();
    }

    private ratio(): number {
        const span = this.maxValue - this.minValue;
        if (span <= 0) return 0;
        return clamp((this.value - this.minValue) / span, 0, 1);
    }

    private snap(raw: number): number {
        const normalized = clamp(raw, this.minValue, this.maxValue);
        if (this.step <= 0) return normalized;
        const steps = Math.round((normalized - this.minValue) / this.step);
        return clamp(this.minValue + steps * this.step, this.minValue, this.maxValue);
    }

    private applyPointer(px: number): void {
        const knobR = Math.max(5, Math.min(7, this.height / 3));
        const trackX0 = knobR;
        const trackX1 = this.width - knobR;
        const span = trackX1 - trackX0;
        if (span <= 0) return;

        const ratio = clamp((px - trackX0) / span, 0, 1);
        const raw = this.minValue + ratio * (this.maxValue - this.minValue);
        const next = this.snap(raw);
        if (next === this.value) return;
        this.value = next;
        this.markPaintDirty();
        this.onChange?.(this.value);
    }

    /** 结束拖拽:把手恢复常态 */
    private endDrag(): void {
        if (!this.dragging) return;
        this.dragging = false;
        this.markPaintDirty();
    }

    private stepBy(direction: number): void {
        this.setValue(this.value + this.step * direction, true);
    }
}
