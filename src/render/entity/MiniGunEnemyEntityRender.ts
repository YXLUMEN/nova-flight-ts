import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../entity/mob/MiniGunEnemyEntity.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(entity.getPositionRef.x - 16 + offsetX, entity.getPositionRef.y - 16 + offsetY, 32, 32);
        ctx.restore();
    }
}