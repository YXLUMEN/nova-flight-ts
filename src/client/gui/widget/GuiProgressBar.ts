import {GuiDraw} from "../GuiDraw.ts";
import {GuiNode} from "../GuiNode.ts";
import {GuiTheme} from "../theme.ts";
import {clamp} from "../../../utils/math/math.ts";

/**
 * 只读进度条。
 *  - ratio 范围 [0,1],支持中间文本(如 "42%");
 *  - 进度色可为强调色或自定义(危险 / 成功等场景)。
 */
export class GuiProgressBar extends GuiNode {
    private ratioValue = 0;
    private barColor: string = GuiTheme.colors.accent;
    private centerText: string | null = null;

    public constructor(ratio: number = 0) {
        super();
        this.ratioValue = clamp(ratio, 0, 1);
    }

    public setRatio(ratio: number): this {
        const next = clamp(ratio, 0, 1);
        if (next === this.ratioValue) return this;

        this.ratioValue = next;
        this.markPaintDirty();
        return this;
    }

    public getRatio(): number {
        return this.ratioValue;
    }

    public setBarColor(color: string): this {
        this.barColor = color;
        this.markPaintDirty();
        return this;
    }

    public setCenterText(text: string | null): this {
        this.centerText = text;
        this.markPaintDirty();
        return this;
    }

    public override measure(): void {
        if (this.width === 0) this.width = 200;
        if (this.height === 0) this.height = 12;
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        const radius = Math.max(2, this.height / 2);

        ctx.save();

        // 背景轨道
        ctx.fillStyle = GuiTheme.colors.track;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, 0, this.width, this.height, radius);
        ctx.fill();

        // 进度
        const fillW = this.width * this.ratioValue;
        if (fillW > 0) {
            ctx.fillStyle = this.barColor;
            ctx.beginPath();
            GuiDraw.roundRectPath(ctx, 0, 0, Math.max(this.height, fillW), this.height, radius);
            ctx.fill();
        }

        // 文本
        if (this.centerText !== null) {
            const font = GuiTheme.font(11, 600);
            GuiDraw.text(ctx, this.width / 2, this.height / 2, this.centerText, {
                font,
                color: "#ffffff",
                align: "center",
                baseline: "middle",
            });
        }
        ctx.restore();
    }
}
