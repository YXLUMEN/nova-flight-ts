import type {EntityRenderer} from "./EntityRenderer.ts";
import type {CloudLightningEntity} from "../../../entity/projectile/CloudLightningEntity.ts";
import {PI2} from "../../../utils/math/math.ts";

export class CloudLightningEntityRender implements EntityRenderer<CloudLightningEntity> {
    public render(entity: CloudLightningEntity, ctx: CanvasRenderingContext2D, tickDelta: number): void {
        const {x, y} = entity.getLerpPos(tickDelta);
        const r = entity.getWidth();

        ctx.beginPath();

        ctx.strokeStyle = 'rgba(176,158,255,0.8)';
        ctx.fillStyle = 'rgba(176,158,255,0.3)';

        ctx.arc(x, y, r, 0, PI2);

        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * PI2;
            const branchLength = Math.random() + r * 0.5;
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * branchLength, y + Math.sin(angle) * branchLength);
        }

        ctx.stroke();
        ctx.fill();
    }
}