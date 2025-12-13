import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../../entity/mob/MiniGunEnemyEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        const pos = entity.getLerpPos(tickDelta);
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - 16 + offsetX, pos.y - 16 + offsetY, 32, 32);
        MiniGunEnemyEntityRender.arrow(ctx, pos, entity.getYaw(), entity.getWidth() + 16, 8, 8, 6);
        ctx.restore();
    }

    public static arrow(ctx: CanvasRenderingContext2D, pos: IVec, yaw: number, offset: number, my: number, x: number, y: number) {
        const arrowX = pos.x + Math.cos(yaw) * offset;
        const arrowY = pos.y + Math.sin(yaw) * offset;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(yaw + HALF_PI);
        ctx.beginPath();
        ctx.moveTo(0, -my);
        ctx.lineTo(x, y);
        ctx.lineTo(-x, y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}