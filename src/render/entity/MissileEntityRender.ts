import type {EntityRenderer} from "./EntityRenderer.ts";
import {type MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {HALF_PI} from "../../utils/math/math.ts";

export class MissileEntityRender implements EntityRenderer<MissileEntity> {
    public render(entity: MissileEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0): void {
        ctx.save();
        ctx.translate(entity.getPositionRef.x + offsetX, entity.getPositionRef.y + offsetY);
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

        if (entity.isIgnite()) {
            ctx.fillStyle = "rgba(255,200,120,.9)";
            ctx.beginPath();
            ctx.moveTo(-3, 8);
            ctx.lineTo(0, 12 + Math.random() * 3);
            ctx.lineTo(3, 8);
            ctx.closePath();
            ctx.fill();
        }

        ctx.stroke();
        ctx.restore();
    }
}