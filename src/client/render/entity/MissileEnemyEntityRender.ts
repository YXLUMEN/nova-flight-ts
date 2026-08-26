import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MissileEnemyEntity} from "../../../entity/mob/MissileEnemyEntity.ts";


export class MissileEnemyEntityRender implements EntityRenderer<MissileEnemyEntity> {
    public render(entity: MissileEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);

        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(entity.getLerpYaw(tickDelta));

        ctx.fillStyle = entity.color.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();

        ctx.moveTo(12, 0);        // 顶点
        ctx.lineTo(4, 10);        // 右上前缘
        ctx.lineTo(-6, 10);       // 上侧机身
        ctx.lineTo(-12, 4);       // 尾部
        ctx.lineTo(-12, -4);      // 尾部
        ctx.lineTo(-6, -10);      // 下侧机身
        ctx.lineTo(4, -10);       // 下侧前缘
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
