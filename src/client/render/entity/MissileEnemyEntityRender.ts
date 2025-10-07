import type {EntityRenderer} from "./EntityRenderer.ts";
import type {MissileEnemyEntity} from "../../../entity/mob/MissileEnemyEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";

export class MissileEnemyEntityRender implements EntityRenderer<MissileEnemyEntity> {
    public render(entity: MissileEnemyEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        const pos = entity.getLerpPos(tickDelta);
        ctx.translate(pos.x + offsetX, pos.y + offsetY);
        ctx.rotate(entity.getLerpYaw(tickDelta) + HALF_PI);

        ctx.fillStyle = entity.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();

        ctx.moveTo(0, -12);       // 顶点
        ctx.lineTo(10, -4);       // 右上斜面
        ctx.lineTo(10, 6);        // 右下机身
        ctx.lineTo(4, 12);        // 右下尾翼
        ctx.lineTo(-4, 12);       // 左下尾翼
        ctx.lineTo(-10, 6);       // 左下机身
        ctx.lineTo(-10, -4);      // 左上斜面
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}
