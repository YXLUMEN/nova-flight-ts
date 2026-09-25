import {GuiContainer} from "../GuiContainer.ts";
import {GuiDraw} from "../GuiDraw.ts";
import {GuiTheme} from "../theme.ts";

/**
 * 面板:带背景与描边的容器。
 * 典型用法:弹窗 / 分组 / 卡片内容区,默认开启动态裁剪并保留内容内边距。
 */
export class GuiPanel extends GuiContainer {
    private panelBackground: string = GuiTheme.colors.surface;
    private panelBorder: string = GuiTheme.colors.border;
    private panelRadius: number = GuiTheme.radiusPanel;

    public constructor() {
        super();
        this.clip = true;
        this.padding = 14;
    }

    public setPanelBackground(color: string): this {
        this.panelBackground = color;
        this.markPaintDirty();
        return this;
    }

    public setPanelBorder(color: string): this {
        this.panelBorder = color;
        this.markPaintDirty();
        return this;
    }

    public setPanelRadius(radius: number): this {
        this.panelRadius = Math.max(0, radius);
        this.markPaintDirty();
        return this;
    }

    protected override renderSelf(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.panelBackground;
        ctx.strokeStyle = this.panelBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        GuiDraw.roundRectPath(ctx, 0, 0, this.width, this.height, this.panelRadius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}
