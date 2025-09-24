import type {IUi} from "./IUi.ts";
import type {World} from "../../world/World.ts";
import {UiTools} from "./UiTools.ts";
import {UITheme} from "./theme.ts";

interface Notification {
    text: string;
    startTime: number;
    duration: number; // 停留时间 秒,基于世界时间
    fadeTime: number; // 淡入淡出时间
}

export class NotificationManager implements IUi {
    private readonly world: World;
    private notifications: Notification[] = [];
    private worldW = 0;
    private worldH = 0;

    public constructor(world: World) {
        this.world = world;
    }

    public setSize(w: number, h: number) {
        this.worldW = w;
        this.worldH = h;
    }

    public show(text: string, duration = 2, fadeTime = 0.3) {
        this.notifications.push({
            text,
            startTime: this.world.getTime(),
            duration,
            fadeTime
        });
    }

    public render(ctx: CanvasRenderingContext2D) {
        if (this.notifications.length === 0) return;

        const now = this.world.getTime();
        ctx.save();
        ctx.font = UITheme.font;

        let offsetY = 0;
        for (let i = 0; i < this.notifications.length; i++) {
            const n = this.notifications[i];
            const elapsed = now - n.startTime;
            const totalTime = n.duration + n.fadeTime * 2;

            if (elapsed > totalTime) {
                // 移除已过期通知
                this.notifications.splice(i, 1);
                i--;
                continue;
            }

            // 计算透明度
            let alpha = 1;
            if (elapsed < n.fadeTime) {
                alpha = elapsed / n.fadeTime; // 淡入
            } else if (elapsed > n.fadeTime + n.duration) {
                alpha = 1 - (elapsed - n.fadeTime - n.duration) / n.fadeTime; // 淡出
            }

            ctx.globalAlpha = alpha;
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            const x = this.worldW / 2;
            const y = this.worldH - 50 - offsetY;

            const textWidth = ctx.measureText(n.text).width;
            const boxW = textWidth + 10 * 2;

            ctx.globalAlpha = alpha;

            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.beginPath();
            UiTools.roundRect(ctx, x - boxW / 2, y - 6, boxW, 40, 6);
            ctx.fill();

            // 边框
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 文本
            ctx.fillStyle = '#fff';
            ctx.fillText(n.text, x, y + 15);

            offsetY += 50;
        }

        ctx.restore();
    }

    public destroy(): void {
        this.notifications.length = 0;
        (this.world as any) = null;
    }
}
