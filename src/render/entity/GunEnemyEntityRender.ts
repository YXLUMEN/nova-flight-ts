import type {EntityRenderer} from "./EntityRenderer.ts";
import {type GunEnemyEntity} from "../../entity/mob/GunEnemyEntity.ts";

export class GunEnemyEntityRender implements EntityRenderer<GunEnemyEntity> {
    public render(entity: GunEnemyEntity, ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.getMutPos.x - 10, entity.getMutPos.y - 10, 20, 20);
        ctx.restore();
    }
}