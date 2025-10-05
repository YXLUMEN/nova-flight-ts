import type {EntityRenderer} from "./EntityRenderer.ts";
import {type GunEnemyEntity} from "../../../entity/mob/GunEnemyEntity.ts";

export class GunEnemyEntityRender implements EntityRenderer<GunEnemyEntity> {
    public render(entity: GunEnemyEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.getPositionRef.x - 10 + offsetX, entity.getPositionRef.y - 10 + offsetY, 20, 20);
        ctx.restore();
    }
}