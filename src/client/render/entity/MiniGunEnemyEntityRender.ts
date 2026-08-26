import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MiniGunEnemyEntity} from "../../../entity/mob/MiniGunEnemyEntity.ts";

import type {Vec2} from "../../../utils/math/Vec2.ts";

export class MiniGunEnemyEntityRender implements EntityRenderer<MiniGunEnemyEntity> {
    public render(entity: MiniGunEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        const dim = entity.getDimensions();
        const r = dim.halfWidth;

        ctx.save();
        ctx.fillStyle = entity.color.color;
        ctx.fillRect(pos.x - r, pos.y - r, dim.width, dim.height);
        this.arrow(ctx, pos, entity.getYaw(), dim.width + r, 8, 8, 6);
        ctx.restore();
    }

    public arrow(ctx: CanvasRenderingContext2D, pos: Vec2, yaw: number, offset: number, my: number, x: number, y: number) {
        const arrowX = pos.x + Math.cos(yaw) * offset;
        const arrowY = pos.y + Math.sin(yaw) * offset;

        ctx.beginPath();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(yaw);

        ctx.moveTo(my, 0);
        ctx.lineTo(-y, x);
        ctx.lineTo(-y, -x);
        ctx.closePath();
        ctx.fill();
    }
}