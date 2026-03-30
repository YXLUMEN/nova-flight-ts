import type {EntityRenderer} from "./EntityRenderer.ts";
import {MagneticTorpedoEntity} from "../../../entity/projectile/MagneticTorpedoEntity.ts";
import {HALF_PI, PI2} from "../../../utils/math/math.ts";

export class MagneticTorpedoEntityRender implements EntityRenderer<MagneticTorpedoEntity> {
    public render(entity: MagneticTorpedoEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        ctx.save();

        if (entity.hitEntity && entity.hitOffset && entity.relativeYaw) {
            const targetPos = entity.hitEntity.getLerpPos(tickDelta);
            const targetYaw = entity.hitEntity.getLerpYaw(tickDelta);
            const yaw = targetYaw + entity.relativeYaw + HALF_PI;

            const offset = MagneticTorpedoEntity.getExploreOffset(
                targetPos, targetYaw, entity.hitOffset
            );
            ctx.translate(offset.x, offset.y);
            ctx.rotate(yaw);
        } else {
            const pos = entity.getLerpPos(tickDelta);
            const yaw = entity.getLerpYaw(tickDelta) + HALF_PI;
            ctx.translate(pos.x, pos.y);
            ctx.rotate(yaw);
        }

        ctx.fillStyle = '#4169E1';
        ctx.strokeStyle = '#1E3A8A';

        ctx.beginPath();
        ctx.rect(-3, -8, 6, 16);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-3, -8);
        ctx.lineTo(0, -16);
        ctx.lineTo(3, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = entity.getCountDown() < 10 ? '#ff2828' : '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 4, 2, 0, PI2);
        ctx.fill();

        ctx.restore();
    }
}