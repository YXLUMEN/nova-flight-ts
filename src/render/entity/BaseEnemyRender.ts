import type {EntityRenderer} from "./EntityRenderer.ts";
import type {BaseEnemy} from "../../entity/mob/BaseEnemy.ts";
import {HALF_PI} from "../../utils/math/math.ts";

export class BaseEnemyRender implements EntityRenderer<BaseEnemy> {
    public render(entity: BaseEnemy, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        ctx.translate(entity.getPositionRef.x + offsetX, entity.getPositionRef.y + offsetY);
        ctx.rotate(entity.getYaw() + HALF_PI);

        ctx.fillStyle = entity.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

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