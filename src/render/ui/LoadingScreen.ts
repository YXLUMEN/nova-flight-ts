import {clamp} from "../../utils/math/math.ts";
import {sleep} from "../../utils/uit.ts";
import {UITheme} from "./theme.ts";
import {UiTools} from "./UiTools.ts";

export class LoadingScreen {
    private readonly width: number;
    private readonly height: number;
    private readonly ctx: CanvasRenderingContext2D;

    private currentProgress: number = 0;
    private targetProgress: number = 0;
    private message: string = '';
    private done: boolean = false;

    public constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
        this.width = width;
        this.height = height;
        this.ctx = ctx;
    }

    public setProgress(progress: number, message?: string) {
        this.targetProgress = clamp(progress, 0, 1);
        if (message !== undefined) {
            this.message = message;
        }
    }

    private update() {
        const speed = 0.1;
        this.currentProgress += (this.targetProgress - this.currentProgress) * speed;
    }

    private render() {
        try {
            const ctx = this.ctx;
            const {width, height} = this;

            // 背景
            ctx.fillStyle = '#00050e';
            ctx.fillRect(0, 0, width, height);

            // 进度条参数
            const barWidth = width * 0.6;
            const barHeight = 16;
            const barX = (width - barWidth) / 2;
            const barY = height / 2;
            const radius = barHeight / 4;

            // 背景条
            ctx.fillStyle = '#333';
            UiTools.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
            ctx.fill();

            // 前景条
            const filledWidth = barWidth * this.currentProgress;
            if (filledWidth > 0) {
                ctx.fillStyle = UITheme.foreground;
                UiTools.roundRect(ctx, barX, barY, filledWidth, barHeight, radius);
                ctx.fill();
            }

            // 百分比文字
            ctx.fillStyle = UITheme.foreground;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.floor(this.currentProgress * 100)}%`, width / 2, barY - 20);

            // 提示文字
            if (this.message) {
                ctx.fillText(this.message, width / 2, barY + 40);
            }
        } catch (error) {
            console.error(error);
        }
    }

    public loop() {
        if (this.done) return;

        this.update();
        this.render();
        requestAnimationFrame(() => this.loop());
    }

    public async setDone() {
        if (this.done) return;

        this.currentProgress = 1;
        await sleep(300);

        this.done = true;
        this.ctx.reset();
        (this.ctx as any) = null;
    }
}
