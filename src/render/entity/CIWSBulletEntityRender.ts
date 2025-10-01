import type {EntityRenderer} from "./EntityRenderer.ts";
import type {CIWSBulletEntity} from "../../entity/projectile/CIWSBulletEntity.ts";

export class CIWSBulletEntityRender implements EntityRenderer<CIWSBulletEntity> {
    public render(entity: CIWSBulletEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        const x = entity.getPositionRef.x + offsetX;
        const y = entity.getPositionRef.y + offsetY;

        ctx.save();

        const vx = entity.getVelocityRef.x;
        const vy = entity.getVelocityRef.y;
        const tailX = x - vx * 2;
        const tailY = y - vy * 2;

        const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, "rgba(255, 200, 100, 0)");
        gradient.addColorStop(1, entity.color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.restore();
    }
}
