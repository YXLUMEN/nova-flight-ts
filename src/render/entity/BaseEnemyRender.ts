import type {EntityRenderer} from "./EntityRenderer.ts";
import type {BaseEnemy} from "../../entity/mob/BaseEnemy.ts";

export class BaseEnemyRender implements EntityRenderer<BaseEnemy> {
    public render(baseEnemy: BaseEnemy, ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(baseEnemy.getMutPosition.x, baseEnemy.getMutPosition.y);

        ctx.fillStyle = baseEnemy.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(-14, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(14, -6);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}