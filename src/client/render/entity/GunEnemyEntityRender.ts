import type {EntityRenderer} from "./EntityRenderer.ts";
import {type GunEnemyEntity} from "../../../entity/mob/GunEnemyEntity.ts";

export class GunEnemyEntityRender implements EntityRenderer<GunEnemyEntity> {
    public render(entity: GunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const dim = entity.getDimensions();
        const pos = entity.getLerpPos(tickDelta);
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - dim.halfWidth + offsetX, pos.y - dim.halfHeight + offsetY, dim.width, dim.height);
        ctx.restore();
    }
}