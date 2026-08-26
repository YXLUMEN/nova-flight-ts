import type {EntityRenderer} from "./EntityRenderer.ts";
import {TrailblazerEntity} from "../../../entity/TrailblazerEntity.ts";


export class TrailblazerEntityRender implements EntityRenderer<TrailblazerEntity> {
    public render(entity: TrailblazerEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        ctx.save();

        ctx.fillStyle = '#ff22c3';
        ctx.strokeStyle = 'rgba(0,0,0,.2)';

        ctx.translate(pos.x, pos.y);
        ctx.rotate(entity.getLerpYaw(tickDelta));

        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-4, 12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-4, -12);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}