import type {EntityRenderer} from "./EntityRenderer.ts";
import {type GunEnemyEntity} from "../../../entity/mob/GunEnemyEntity.ts";

export class GunEnemyEntityRender implements EntityRenderer<GunEnemyEntity> {
    public render(entity: GunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const dim = entity.getDimensions();
        const pos = entity.getLerpPos(tickDelta);

        ctx.fillStyle = entity.color.color;
        ctx.fillRect(pos.x - dim.halfWidth, pos.y - dim.halfHeight, dim.width, dim.height);
    }
}