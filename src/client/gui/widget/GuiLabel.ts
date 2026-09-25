import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import type {GuiAlign} from "../types.ts";
import {type GuiText, textOf} from "../types.ts";

/**
 * 文本标签。
 *  - width 为 0 时按文本内容自动计算宽度(autoWidth);
 *  - height 为 0 时按字号行高自动计算高度。
 */
export class GuiLabel extends GuiNode {
    private value: GuiText;
    private color: string = GuiTheme.colors.text;
    private fontSize = 14;
    private weight: string | number = 400;
    private align: GuiAlign = "start";

    public constructor(text: GuiText) {
        super();
        this.value = text;
    }

    public setText(text: GuiText): this {
        this.value = text;
        this.markLayoutDirty();
        return this;
    }

    public getText(): GuiText {
        return this.value;
    }

    public setColor(color: string): this {
        this.color = color;
        this.markPaintDirty();
        return this;
    }

    public setFontSize(size: number): this {
        this.fontSize = Math.max(1, size);
        this.markLayoutDirty();
        return this;
    }

    public setWeight(weight: string | number): this {
        this.weight = weight;
        this.markLayoutDirty();
        return this;
    }

    public setAlign(align: GuiAlign): this {
        this.align = align;
        this.markPaintDirty();
        return this;
    }

    public override measure(_ctx:CanvasRenderingContext2D): void {
        if (this.width === 0) this.autoWidth = true;
        if (this.height === 0) this.autoHeight = true;
        if (!this.autoWidth && !this.autoHeight) return;

        const font = GuiTheme.font(this.fontSize, this.weight);
        if (this.autoWidth) {
            this.width = Math.ceil(GuiDraw.measure(textOf(this.value), font));
        }
        if (this.autoHeight) {
            this.height = GuiTheme.lineHeight(this.fontSize);
        }
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const font = GuiTheme.font(this.fontSize, this.weight);
        ctx.save();

        let alignX: number;
        switch (this.align) {
            case "center":
                alignX = this.width / 2;
                break;
            case "end":
                alignX = this.width;
                break;
            default:
                alignX = 0;
        }

        GuiDraw.text(ctx, alignX, this.height / 2, textOf(this.value), {
            font,
            color: this.color,
            align: this.align === "center" ? "center" : this.align === "end" ? "right" : "left",
            baseline: "middle",
        });
        ctx.restore();
    }
}
