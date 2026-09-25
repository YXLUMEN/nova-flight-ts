import {GuiDraw} from "../GuiDraw.ts";
import {GuiScreen} from "../GuiScreen.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {GuiMouseButton, type GuiText, textOf} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";

/**
 * 单行文本输入框。
 *  - 点击定位光标,支持 左右 / Home / End / Backspace / Delete;
 *  - Enter 触发 onSubmit(按 blurOnSubmit 决定是否失焦);Esc 失焦;
 *  - 文本超宽时自动横向滚动,保证光标始终可见;
 *  - masked 模式以 "•" 显示(密码等场景)。
 *
 * 注:canvas 侧文本输入对中文 IME 支持有限,复杂输入建议沿用 DOM 覆盖层方案。
 */
export class GuiTextField extends GuiNode {
    /** 提交后是否自动失焦 */
    public blurOnSubmit = true;

    private textValue = "";
    private placeholder: GuiText | null = null;
    private onChange: Consumer<string> | null = null;
    private onSubmit: Consumer<string> | null = null;
    private maxLength = 0;
    private masked = false;
    private caret = 0;
    private scrollX = 0;
    private blinkTime = 0;
    private readonly padX = 10;

    public constructor(initial: string = "") {
        super();
        this.textValue = initial;
        this.caret = initial.length;
        this.focusable = true;
    }

    public getText(): string {
        return this.textValue;
    }

    public setText(text: string): this {
        this.textValue = text;
        this.caret = text.length;
        this.scrollX = 0;
        this.resetCaret();
        return this;
    }

    public setPlaceholder(placeholder: GuiText | null): this {
        this.placeholder = placeholder;
        this.markPaintDirty();
        return this;
    }

    public setMaxLength(max: number): this {
        this.maxLength = Math.max(0, max);
        return this;
    }

    public setMasked(masked: boolean): this {
        this.masked = masked;
        this.markPaintDirty();
        return this;
    }

    public onChanged(callback: Consumer<string>): this {
        this.onChange = callback;
        return this;
    }

    public onSubmitPressed(callback: Consumer<string>): this {
        this.onSubmit = callback;
        return this;
    }

    public override measure(_ctx: CanvasRenderingContext2D): void {
        if (this.width === 0) this.width = 220;
        if (this.height === 0) this.height = GuiTheme.controlHeight;
    }

    public override tick(dt: number): void {
        if (!this.focused) return;

        const visible = this.isCaretVisible();
        this.blinkTime += dt;

        // 仅在闪烁状态翻转的那一帧需要重绘
        if (this.isCaretVisible() !== visible) this.markPaintDirty();
    }

    public override setFocused(focused: boolean): void {
        super.setFocused(focused);
        if (!focused) return;

        this.caret = this.textValue.length;
        this.scrollX = 0;
        this.resetCaret();
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.enabled || !this.visible || event.button !== GuiMouseButton.LEFT) return null;
        if (!this.containsPoint(event.offsetX, event.offsetY)) return null;

        const localX = event.offsetX - this.absX;
        this.caret = this.resolveCaret(localX);
        this.resetCaret();
        return this;
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (!this.enabled || !this.focused) return false;

        switch (event.code) {
            case "Backspace":
                if (this.caret > 0) {
                    this.textValue = this.textValue.slice(0, this.caret - 1) + this.textValue.slice(this.caret);
                    this.caret--;
                    this.notifyChange();
                    this.resetCaret();
                }
                return true;
            case "Delete":
                if (this.caret < this.textValue.length) {
                    this.textValue = this.textValue.slice(0, this.caret) + this.textValue.slice(this.caret + 1);
                    this.notifyChange();
                    this.resetCaret();
                }
                return true;
            case "ArrowLeft":
                this.caret = Math.max(0, this.caret - 1);
                this.markPaintDirty();
                return true;
            case "ArrowRight":
                this.caret = Math.min(this.textValue.length, this.caret + 1);
                this.markPaintDirty();
                return true;
            case "Home":
                this.caret = 0;
                this.markPaintDirty();
                return true;
            case "End":
                this.caret = this.textValue.length;
                this.markPaintDirty();
                return true;
            case "Enter":
                if (this.onSubmit) this.onSubmit(this.textValue);
                if (this.blurOnSubmit) this.requestBlur();
                return true;
            case "Escape":
                this.requestBlur();
                return true;
            default:
                return false;
        }
    }

    public override insertChar(char: string): boolean {
        if (!this.enabled || !this.focused) return false;
        if (char.length !== 1) return false;
        if (this.maxLength > 0 && this.textValue.length >= this.maxLength) return true;

        this.textValue = this.textValue.slice(0, this.caret) + char + this.textValue.slice(this.caret);
        this.caret++;
        this.notifyChange();
        this.resetCaret();
        return true;
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const font = GuiTheme.defaultFont;
        const display = this.displayText();
        const areaW = Math.max(0, this.width - this.padX * 2);

        // 先按最新光标位置计算滚动量
        this.scrollX = this.computeScrollX(display, font, areaW);

        ctx.save();

        // 外框
        ctx.fillStyle = this.enabled ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)";
        ctx.strokeStyle = this.focused && this.enabled ? GuiTheme.colors.accent : GuiTheme.colors.border;
        ctx.lineWidth = this.focused ? 1.5 : 1;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, 0, this.width, this.height, GuiTheme.radius);
        ctx.fill();
        ctx.stroke();

        const yCenter = this.height / 2;

        // 内容裁剪区域(防止文本溢出圆角框)
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.padX, 0, areaW, this.height);
        ctx.clip();

        if (display.length === 0 && this.placeholder !== null && !this.focused) {
            GuiDraw.text(
                ctx,
                this.padX,
                yCenter,
                textOf(this.placeholder),
                font,
                GuiTheme.colors.textMuted,
                undefined,
                'middle'
            );
        } else {
            GuiDraw.text(
                ctx,
                this.padX - this.scrollX,
                yCenter,
                display,
                font,
                this.enabled ? GuiTheme.colors.text : GuiTheme.colors.textMuted,
                undefined,
                'middle'
            );

            if (this.focused && this.enabled && this.isCaretVisible()) {
                const caretX = this.padX - this.scrollX + GuiDraw.measure(display.slice(0, this.caret), font);
                ctx.strokeStyle = GuiTheme.colors.caret;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(Math.round(caretX) + 0.5, yCenter - 9);
                ctx.lineTo(Math.round(caretX) + 0.5, yCenter + 9);
                ctx.stroke();
            }
        }
        ctx.restore();
        ctx.restore();
    }

    private displayText(): string {
        return this.masked ? "\u2022".repeat(this.textValue.length) : this.textValue;
    }

    /** 点击 x(相对控件左缘)→ 最近字符边界下标 */
    private resolveCaret(localX: number): number {
        const font = GuiTheme.defaultFont;
        const display = this.displayText();

        // 内容区起点 = 内边距 - 滚动量
        const target = localX - this.padX + this.scrollX;
        if (target <= 0) return 0;

        let width = 0;
        for (let i = 0; i < display.length; i++) {
            const charWidth = GuiDraw.measure(display[i], font);
            width += charWidth;
            if (width > target) {
                // 取最近的边界
                return (width - target) < charWidth / 2 ? i + 1 : i;
            }
        }
        return display.length;
    }

    /** 光标滚动量:尽量让光标位于可视区内,且不越过文本末端 */
    private computeScrollX(display: string, font: string, areaW: number): number {
        const caretLeft = GuiDraw.measure(display.slice(0, this.caret), font);
        const textWidth = GuiDraw.measure(display, font);
        const maxScroll = Math.max(0, textWidth - areaW);
        const minScroll = 0;

        // 光标在左边界外 → 回滚
        let scroll = this.scrollX;
        if (caretLeft - scroll < 0) scroll = caretLeft;
        if (caretLeft - scroll > areaW) scroll = caretLeft - areaW + 4;
        return Math.min(maxScroll, Math.max(minScroll, scroll));
    }

    /** 重置光标闪烁:编辑 / 定位后从头显示光标,并提交重绘 */
    private resetCaret(): void {
        this.blinkTime = 0;
        this.markPaintDirty();
    }

    private notifyChange(): void {
        this.onChange?.(this.textValue);
    }

    /** 光标可见相位:1s 周期内前 550ms 显示(毫秒计时) */
    private isCaretVisible(): boolean {
        return (this.blinkTime % 1000) < 550;
    }

    private requestBlur(): void {
        let node: GuiNode = this;
        while (node.parent) node = node.parent;
        if (node instanceof GuiScreen) node.setFocus(null);
    }
}
