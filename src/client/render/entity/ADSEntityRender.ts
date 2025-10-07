import type {EntityRenderer} from "./EntityRenderer.ts";
import {type ADSEntity} from "../../../entity/ADSEntity.ts";

export class ADSEntityRender implements EntityRenderer<ADSEntity> {
    public render(entity: ADSEntity, ctx: CanvasRenderingContext2D, tickDelta: number): void {
        ctx.save();
        ctx.fillStyle = '#fff';
        const pos = entity.getLerpPos(tickDelta);
        ctx.fillRect(pos.x - 8, pos.y - 8, 16, 16);
        ctx.restore();
    }
}