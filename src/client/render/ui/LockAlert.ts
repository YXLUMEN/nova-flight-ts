import {PI2} from "../../../utils/math/math.ts";
import type {RGB} from "../../../type/types.ts";
import {rgba} from "../../../utils/uit.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class LockAlert {
    private readonly shadow: RGB[] = [
        [255, 175, 70],
        [255, 119, 70],
        [255, 70, 70],
    ];
    private readonly stroke: RGB[] = [
        [255, 154, 30],
        [255, 104, 70],
        [255, 70, 70],
    ];
    private readonly text: TranslatableText[] = [
        TranslatableText.of('hud.lock_alert.locking'),
        TranslatableText.of('hud.lock_alert.locked'),
        TranslatableText.of('hud.lock_alert.approach'),
    ];
    private x: number = 0;
    private y: number = 0;

    public render(ctx: CanvasRenderingContext2D, flag: LockPhase) {
        const t = performance.now() * 0.01;
        const pulse = (Math.sin(t * PI2) + 1) / 2;
        const borderAlpha = 0.35 + 0.45 * pulse;

        ctx.save();

        // 背景板
        ctx.fillStyle = 'rgb(10 10 12 / 0.6)';
        ctx.shadowColor = rgba(this.shadow[flag], borderAlpha);
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.rect(this.x, this.y, 120, 32);
        ctx.closePath();
        ctx.fill();

        // 外边框
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.strokeStyle = rgba(this.stroke[flag], borderAlpha);
        ctx.stroke();

        // 文案
        ctx.font = `bold 14px ui-monospace, Menlo, Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(255,60,60,0.4)';

        ctx.fillText(this.text[flag].toString(), this.x + 60, this.y + 16);

        ctx.restore();
    }

    public setPos(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

export const enum LockPhase {
    LOCKING,
    LOCKED,
    APPROACH
}