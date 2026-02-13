import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../../entity/mob/MiniGunEnemyEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";
import type {IVec} from "../../../utils/math/IVec.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getLerpPos(tickDelta);
        const dim = entity.getDimensions();
        const r = dim.halfWidth;

        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - r + offsetX, pos.y - r + offsetY, dim.width, dim.height);
        MiniGunEnemyEntityRender.arrow(ctx, pos, entity.getYaw(), dim.width + r, 8, 8, 6);
        ctx.restore();
    }

    public static arrow(ctx: CanvasRenderingContext2D, pos: IVec, yaw: number, offset: number, my: number, x: number, y: number) {
        const arrowX = pos.x + Math.cos(yaw) * offset;
        const arrowY = pos.y + Math.sin(yaw) * offset;

        ctx.beginPath();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(yaw + HALF_PI);

        ctx.moveTo(0, -my);
        ctx.lineTo(x, y);
        ctx.lineTo(-x, y);
        ctx.closePath();
        ctx.fill();
    }
}