import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {type GuiButtonVariant, GuiMouseButton, type GuiText, textOf} from "../types.ts";
import type {Consumer} from "../../../type/types.ts";

/**
 * 按钮:支持悬停 / 按下 / 禁用 / 键盘激活(Enter / Space)。
 * width 为 0 时自动按文本宽度扩展;height 为 0 时使用标准控件高度。
 */
export class GuiButton extends GuiNode {
    private label: GuiText;
    private variant: GuiButtonVariant = "normal";
    private onClick: Consumer<void> | null = null;
    private pressed = false;

    public constructor(label: GuiText) {
        super();
        this.label = label;
        this.focusable = true;
    }

    public setLabel(label: GuiText): this {
        this.label = label;
        this.markLayoutDirty();
        return this;
    }

    public setVariant(variant: GuiButtonVariant): this {
        this.variant = variant;
        this.markPaintDirty();
        return this;
    }

    public onClicked(callback: Consumer<void>): this {
        this.onClick = callback;
        return this;
    }

    public override measure(): void {
        if (this.width === 0) this.autoWidth = true;
        if (this.height === 0) this.autoHeight = true;

        if (this.autoWidth) {
            const font = GuiTheme.font(14, 600);
            this.width = Math.ceil(GuiDraw.measure(textOf(this.label), font)) + 44;
        }
        if (this.autoHeight) {
            this.height = GuiTheme.controlHeight;
        }
    }

    public override pointerDown(event: PointerEvent): GuiNode | null {
        if (!this.enabled || !this.visible || event.button !== GuiMouseButton.LEFT) return null;
        if (!this.containsPoint(event.offsetX, event.offsetY)) return null;

        this.pressed = true;
        this.markPaintDirty();
        return this;
    }

    public override pointerUp(event: PointerEvent): void {
        const wasPressed = this.pressed;
        this.pressed = false;
        if (wasPressed) this.markPaintDirty();

        if (wasPressed && this.enabled && this.containsPoint(event.offsetX, event.offsetY)) {
            this.onClick?.();
        }
    }

    public override pointerCancel(): void {
        if (!this.pressed) return;
        this.pressed = false;
        this.markPaintDirty();
    }

    public override keyDown(event: KeyboardEvent): boolean {
        if (!this.enabled || !this.focused) return false;
        if (event.code !== 'Enter' && event.code !== 'Space') return false;

        this.onClick?.();
        return true;
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const colors = this.getStyle();
        const alpha = this.enabled ? 1 : 0.45;

        ctx.save();
        ctx.globalAlpha = alpha;

        ctx.fillStyle = colors.background;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, 0, this.width, this.height, GuiTheme.radius);
        ctx.fill();

        if (this.hovered && this.enabled) {
            ctx.fillStyle = colors.hover;
            ctx.fill();
        }
        if (this.pressed && this.enabled) {
            ctx.fillStyle = GuiTheme.colors.press;
            ctx.fill();
        }

        ctx.stroke();

        if (this.focused && this.enabled) {
            ctx.strokeStyle = GuiTheme.colors.accent;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        const font = GuiTheme.font(14, 600);
        GuiDraw.text(
            ctx,
            this.width / 2, this.height / 2 + (this.pressed ? 1 : 0),
            textOf(this.label),
            font,
            this.enabled ? colors.text : GuiTheme.colors.textMuted,
            'center',
            'middle'
        );
        ctx.restore();
    }

    private getStyle(): GuiButtonStyle {
        return GuiButton.STYLES[this.variant] ?? GuiButton.STYLES.normal;
    }

    private static readonly STYLES: Record<string, GuiButtonStyle> = {
        primary: {
            background: GuiTheme.colors.accent,
            border: GuiTheme.colors.accent,
            text: "#06131f",
            hover: "rgba(255,255,255,0.20)",
        },
        danger: {
            background: "rgba(255,92,92,0.16)",
            border: GuiTheme.colors.danger,
            text: GuiTheme.colors.danger,
            hover: "rgba(255,92,92,0.22)",
        },
        ghost: {
            background: "transparent",
            border: "rgba(255,255,255,0)",
            text: GuiTheme.colors.text,
            hover: "rgba(255,255,255,0.08)",
        },
        normal: {
            background: "rgba(255,255,255,0.07)",
            border: GuiTheme.colors.border,
            text: GuiTheme.colors.text,
            hover: GuiTheme.colors.hover,
        }
    };
}

interface GuiButtonStyle {
    readonly background: string,
    readonly border: string,
    readonly text: string,
    readonly hover: string,
}