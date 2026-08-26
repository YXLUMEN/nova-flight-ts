import type {EntityRenderer} from "./EntityRenderer.ts";
import type {BaseBossEntity} from "../../../entity/mob/BaseBossEntity.ts";
import {PI2} from "../../../utils/math/math.ts";
import {hexToRgb, mix, rgb, rgba} from "../../../utils/uit.ts";

export class BossEntityRender implements EntityRenderer<BaseBossEntity> {
    public render(entity: BaseBossEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        const yaw = entity.getLerpYaw(tickDelta);
        const t = entity.age + tickDelta; // 动画时间轴

        const base = hexToRgb(entity.color.color);
        const light = mix(base, 0.45);
        const dark = mix(base, -0.55);
        const glow = mix(base, 0.75);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(yaw);

        // ---------- 1. 旋转的护盾/雷达光环 ----------
        const ringAlpha = 0.22 + 0.1 * Math.sin(t * 0.1);
        ctx.save();
        ctx.rotate(t * 0.02);
        ctx.strokeStyle = rgba(glow, ringAlpha);
        ctx.lineWidth = 2.5;
        ctx.setLineDash([16, 20]);
        ctx.beginPath();
        ctx.arc(0, 0, 152, 0, PI2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        ctx.save();
        ctx.rotate(-t * 0.013);
        ctx.strokeStyle = rgba(glow, ringAlpha * 0.6);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, 168, 0, PI2);
        ctx.stroke();
        ctx.restore();

        // ---------- 2. 尾焰（先画，根部被船体遮住更自然） ----------
        const flames: Array<[number, number, number]> = [[-72, 46, 0], [-72, -46, 2.1], [-96, 0, 4.2]];
        for (const [fx, fy, phase] of flames) {
            const len = 30 + 20 * Math.sin(t * 0.55 + phase) + Math.random() * 16;
            const g = ctx.createLinearGradient(fx, fy, fx - len, fy);
            g.addColorStop(0, "rgba(255,255,230,.95)");
            g.addColorStop(0.35, "rgba(255,170,60,.85)");
            g.addColorStop(1, "rgba(255,60,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(fx, fy - 14);
            ctx.lineTo(fx - len, fy);
            ctx.lineTo(fx, fy + 14);
            ctx.closePath();
            ctx.fill();
        }

        // ---------- 3. 船体：暗色轮廓 + 渐变主壳 ----------
        ctx.beginPath();
        ctx.moveTo(144, 0);
        ctx.lineTo(-48, -122);
        ctx.lineTo(-96, 0);
        ctx.lineTo(-48, 122);
        ctx.closePath();

        ctx.fillStyle = rgb(dark);
        ctx.strokeStyle = rgba(mix(base, -0.75), 0.9);
        ctx.lineWidth = 5;
        ctx.stroke();

        const hullGrad = ctx.createLinearGradient(150, 0, -100, 0);
        hullGrad.addColorStop(0, rgb(light));
        hullGrad.addColorStop(0.45, rgb(base));
        hullGrad.addColorStop(1, rgb(dark));
        ctx.fillStyle = hullGrad;
        ctx.fill();

        // ---------- 侧舷炮塔 ----------
        ctx.strokeStyle = rgba(mix(base, -0.7), 1);
        ctx.lineWidth = 2;
        for (const [tx, ty] of [[-16, -58], [-16, 58], [44, -52], [44, 52]]) {
            ctx.fillStyle = rgb(mix(base, -0.35));
            ctx.fillRect(tx + 6, ty - 5, 26, 10); // 炮管
            ctx.fillStyle = rgb(mix(base, 0.15));
            ctx.beginPath();
            ctx.arc(tx + 6, ty, 14, 0, PI2);      // 基座
            ctx.fill();
            ctx.stroke();
        }

        // ---------- 6. 核心反应堆（脉动发光） ----------
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.12);
        ctx.save();
        ctx.shadowColor = rgb(glow);
        ctx.shadowBlur = 20 + 16 * pulse;
        ctx.fillStyle = rgba(glow, 0.55 + 0.35 * pulse);
        ctx.beginPath();
        ctx.arc(18, 0, 15 + 2.5 * pulse, 0, PI2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,.9)";
        ctx.beginPath();
        ctx.arc(18, 0, 6 + 1.5 * pulse, 0, PI2);
        ctx.fill();
        ctx.restore();

        // ---------- 7. 霓虹机鼻描边 ----------
        ctx.strokeStyle = rgba(glow, 0.8);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(144, 0);
        ctx.lineTo(-48, -122);
        ctx.lineTo(-96, 0);
        ctx.lineTo(-48, 122);
        ctx.closePath();
        ctx.stroke();

        ctx.restore();
    }
}
