import type {EntityRenderer} from "./EntityRenderer.ts";
import {TrailblazerEntity} from "../../../entity/TrailblazerEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";

export class TrailblazerEntityRender implements EntityRenderer<TrailblazerEntity> {
    public render(entity: TrailblazerEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        ctx.save();

        ctx.fillStyle = '#ff22c3';
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.translate(pos.x, pos.y);
        ctx.rotate(entity.getLerpYaw(tickDelta) + HALF_PI);

        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(12, 4);
        ctx.lineTo(0, 10);
        ctx.lineTo(-12, 4);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}