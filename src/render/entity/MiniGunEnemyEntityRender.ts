import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../entity/mob/MiniGunEnemyEntity.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.getMutPos.x, entity.getMutPos.y, 32, 32);
        ctx.restore();
    }
}