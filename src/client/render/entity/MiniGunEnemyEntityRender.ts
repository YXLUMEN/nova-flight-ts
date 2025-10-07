import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../../entity/mob/MiniGunEnemyEntity.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        const pos = entity.getLerpPos(tickDelta);
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - 16 + offsetX, pos.y - 16 + offsetY, 32, 32);
        ctx.restore();
    }
}