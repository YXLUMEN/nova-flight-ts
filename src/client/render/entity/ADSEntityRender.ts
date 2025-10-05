import type {EntityRenderer} from "./EntityRenderer.ts";
import {type ADSEntity} from "../../../entity/ADSEntity.ts";

export class ADSEntityRender implements EntityRenderer<ADSEntity> {
    public render(entity: ADSEntity, ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = '#fff';
        ctx.fillRect(entity.getPositionRef.x - 8, entity.getPositionRef.y - 8, 16, 16);
        ctx.restore();
    }
}