import type {EntityRenderer} from "./EntityRenderer.ts";
import {HALF_PI} from "../../utils/math/math.ts";
import type {RocketEntity} from "../../entity/projectile/RocketEntity.ts";

export class RocketEntityRender implements EntityRenderer<RocketEntity> {
    public render(entity: RocketEntity, ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(entity.getPositionRef.x, entity.getPositionRef.y);
        ctx.rotate(entity.getYaw() + HALF_PI);

        ctx.fillStyle = entity.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(7, 3);
        ctx.lineTo(0, 6);
        ctx.lineTo(-7, 3);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}