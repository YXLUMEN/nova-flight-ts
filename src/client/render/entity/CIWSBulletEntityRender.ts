import type {EntityRenderer} from "./EntityRenderer.ts";
import type {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";

export class CIWSBulletEntityRender implements EntityRenderer<CIWSBulletEntity> {
    public render(entity: CIWSBulletEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getLerpPos(tickDelta);
        const x = pos.x + offsetX;
        const y = pos.y + offsetY;

        const tailX = x - entity.getVelocityRef.x;
        const tailY = y - entity.getVelocityRef.y;

        ctx.save();
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
