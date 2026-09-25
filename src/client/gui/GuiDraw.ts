import {GuiTheme} from "./theme.ts";

/**
 * 画布绘制工具集。
 * 负责统一圆角路径、文字排版与测量,避免各控件重复样板代码。
 */
export class GuiDraw {
    private static readonly ctx = new OffscreenCanvas(1, 1).getContext('2d')!;

    /** 生成圆角矩形路径(半径自动收敛,防止大于边长) */
    public static roundRectPath(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ): void {
        const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
        if (radius <= 0) {
            ctx.rect(x, y, w, h);
            return;
        }

        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + w - radius, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius);
        ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    public static measure(text: string, font: string = GuiTheme.defaultFont): number {
        this.ctx.font = font;
        return this.ctx.measureText(text).width;
    }

    public static text(
        ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
        x: number,
        y: number,
        text: string,
        font: string = GuiTheme.defaultFont,
        color: string = GuiTheme.colors.text,
        textAlign: CanvasTextAlign = 'left',
        textBaseline: CanvasTextBaseline = 'alphabetic',
    ): void {
        ctx.font = font
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;
        ctx.fillText(text, x, y);
    }
}
