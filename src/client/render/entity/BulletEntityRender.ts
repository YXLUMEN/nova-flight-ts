import {type BulletEntity} from "../../../entity/projectile/BulletEntity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import {PI2} from "../../../utils/math/math.ts";

export class BulletEntityRender implements EntityRenderer<BulletEntity> {
    public render(entity: BulletEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        const x = entity.getPositionRef.x + offsetX;
        const y = entity.getPositionRef.y + offsetY;
        const radius = entity.getWidth();

        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, PI2);
        ctx.fill();

        if (entity.edgeColor) {
            ctx.strokeStyle = entity.edgeColor;
            ctx.arc(x, y, radius + 1, 0, PI2);
        }

        ctx.stroke();
        ctx.restore();
    }
}