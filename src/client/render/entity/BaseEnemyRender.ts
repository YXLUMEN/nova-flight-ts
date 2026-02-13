import type {EntityRenderer} from "./EntityRenderer.ts";
import type {BaseEnemy} from "../../../entity/mob/BaseEnemy.ts";
import {HALF_PI} from "../../../utils/math/math.ts";

export class BaseEnemyRender implements EntityRenderer<BaseEnemy> {
    public render(entity: BaseEnemy, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        ctx.save();

        ctx.fillStyle = entity.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.translate(pos.x, pos.y);
        ctx.rotate(entity.getLerpYaw(tickDelta) + HALF_PI);

        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 6);
        ctx.lineTo(0, 12);
        ctx.lineTo(-14, 6);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}