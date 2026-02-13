import type {EntityRenderer} from "./EntityRenderer.ts";
import {type ExplodeBulletEntity} from "../../../entity/projectile/ExplodeBulletEntity.ts";
import {HALF_PI} from "../../../utils/math/math.ts";

export class ExplodeBulletEntityRender implements EntityRenderer<ExplodeBulletEntity> {
    public render(entity: ExplodeBulletEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getLerpPos(tickDelta);
        const x = pos.x + offsetX;
        const y = pos.y + offsetY;

        const dim = entity.getDimensions();
        const r = dim.halfWidth;
        const tailLength = dim.height;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(entity.getYaw());
        ctx.fillStyle = entity.color;

        ctx.beginPath();
        ctx.arc(0, 0, r, -HALF_PI, HALF_PI, false);
        ctx.lineTo(-tailLength, r);
        ctx.lineTo(-tailLength, -r);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-tailLength + 5, -r);
        ctx.lineTo(-tailLength + 5, r);
        ctx.stroke();

        ctx.restore();
    }
}