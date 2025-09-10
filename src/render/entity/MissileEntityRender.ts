import type {EntityRenderer} from "./EntityRenderer.ts";
import {type MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {HALF_PI} from "../../utils/math/math.ts";

export class MissileEntityRender implements EntityRenderer<MissileEntity> {
    public render(entity: MissileEntity, ctx: CanvasRenderingContext2D): void {
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