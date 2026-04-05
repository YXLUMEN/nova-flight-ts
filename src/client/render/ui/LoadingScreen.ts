import {clamp} from "../../../utils/math/math.ts";
import {sleep} from "../../../utils/uit.ts";
import {UITheme} from "./theme.ts";
import {UiTools} from "./UiTools.ts";
import type {IUi} from "./IUi.ts";
import {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {Supplier} from "../../../type/types.ts";

export class LoadingScreen implements IUi {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly ctrl = new AbortController();
    private readonly unsubResize: Supplier<void>;

    private width: number = 0;
    private height: number = 0;

    private currentProgress: number = 0;
    private targetProgress: number = 0;
    private message: string = '';

    private currentSubProgress: number = 0;
    private targetSubProgress: number = 0;
    private subMessage: string = '';
    private showSubBar: boolean = false;

    private done: boolean = false;

    public constructor(client: NovaFlightClient) {
        this.ctx = client.window.ctx;
        this.unsubResize = client.window.onResize(this.setSize.bind(this));
    }

    public setProgress(progress: number, message?: string) {
        this.targetProgress = clamp(progress, 0, 1);
        if (message !== undefined) {
            this.message = message;
        }
    }

    public setSubProgress(progress: number, message?: string) {
        this.targetSubProgress = clamp(progress, 0, 1);
        this.showSubBar = true;
        if (message !== undefined) {
            this.subMessage = message;
        }
    }

    public hideSubBar() {
        this.showSubBar = false;
    }

    private update() {
        const speed = 0.1;
        this.currentProgress += (this.targetProgress - this.currentProgress) * speed;
        this.currentSubProgress += (this.targetSubProgress - this.currentSubProgress) * speed;
    }

    public render() {
        try {
            const ctx = this.ctx;
            const {width, height} = this;

            // 背景
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
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
            ctx.fillText(`${Math.floor(this.currentProgress * 100)}%`, width / 2, barY - 20);

            // 提示文字
            if (this.message) {
                ctx.fillText(this.message, width / 2, barY + 40);
            }

            if (!this.showSubBar) return;

            const subBarHeight = 8;
            const subBarWidth = barWidth * 0.8;
            const subBarX = (width - subBarWidth) / 2;
            const subBarY = barY + 70;

            ctx.fillStyle = '#333';
            UiTools.roundRect(ctx, subBarX, subBarY, subBarWidth, subBarHeight, subBarHeight / 4);
            ctx.fill();

            const subFilledWidth = subBarWidth * this.currentSubProgress;
            if (subFilledWidth > 0) {
                ctx.fillStyle = UITheme.accent || '#66aaff';
                UiTools.roundRect(ctx, subBarX, subBarY, subFilledWidth, subBarHeight, subBarHeight / 4);
                ctx.fill();
            }

            if (this.subMessage) {
                ctx.fillStyle = UITheme.foreground;
                ctx.fillText(this.subMessage, width / 2, subBarY + 20);
            }
        } catch (error) {
            console.error(error);
        }
    }

    public loop() {
        if (this.done) return;

        this.update();
        this.render();
        requestAnimationFrame(this.bindLoop);
    }

    private bindLoop = this.loop.bind(this);

    public async setDone() {
        if (this.done) return;

        this.currentProgress = 1;
        this.currentSubProgress = 1;
        await sleep(300);

        this.done = true;
        this.destroy();
    }

    public setSize(w: number, h: number): void {
        this.width = w;
        this.height = h;
    }

    public destroy(): void {
        this.ctrl.abort();
        this.unsubResize();
    }
}
