import type {EntityRenderer} from "./EntityRenderer.ts";
import type {DecoyEntity} from "../../../entity/DecoyEntity.ts";
import {PI2} from "../../../utils/math/math.ts";

export class DecoyEntityRender implements EntityRenderer<DecoyEntity> {
    public render(entity: DecoyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getLerpPos(tickDelta);
        const size = entity.getWidth();
        const glowColor = 'rgba(255,254,183,0.8)';

        const pulse = 1 + Math.sin(entity.age * 0.25) * 0.1;

        ctx.save();
        ctx.translate(pos.x + offsetX, pos.y + offsetY);
        ctx.rotate(entity.age * 0.02);
        ctx.scale(pulse, pulse);

        // 渐变描边
        const gradient = ctx.createLinearGradient(-size, -size, size, size);
        gradient.addColorStop(0, 'rgba(255,255,200,0.2)');
        gradient.addColorStop(0.5, glowColor);
        gradient.addColorStop(1, 'rgba(255,255,200,0.2)');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;

        // 十字形
        ctx.beginPath();
        ctx.moveTo(-size, 0);
        ctx.lineTo(size, 0);
        ctx.moveTo(0, -size);
        ctx.lineTo(0, size);
        ctx.stroke();

        // 中心发光圆
        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
        coreGradient.addColorStop(0, 'rgba(255,255,200,1)');
        coreGradient.addColorStop(1, 'rgba(255,255,200,0)');
        ctx.fillStyle = coreGradient;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.6, 0, PI2);
        ctx.fill();

        ctx.restore();
    }
}