import type {BulletEntity} from "../../entity/projectile/BulletEntity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";

export class CIWSBulletEntityRender implements EntityRenderer<BulletEntity> {
    public render(entity: BulletEntity, ctx: CanvasRenderingContext2D) {
        const {x, y} = entity.getPositionRef;
        const radius = entity.getBoxRadius();

        ctx.save();

        const vx = entity.getVelocityRef.x;
        const vy = entity.getVelocityRef.y;
        const tailX = x - vx * 2;
        const tailY = y - vy * 2;

        const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, "rgba(255, 200, 100, 0)");
        gradient.addColorStop(1, entity.color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = radius * 1.2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.restore();
    }
}
