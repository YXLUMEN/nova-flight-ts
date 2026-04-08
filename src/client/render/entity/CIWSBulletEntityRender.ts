import type {EntityRenderer} from "./EntityRenderer.ts";
import type {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";

export class CIWSBulletEntityRender implements EntityRenderer<CIWSBulletEntity> {
    public render(entity: CIWSBulletEntity, ctx: CanvasRenderingContext2D, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        const vel = entity.velocityRef;

        const tailX = pos.x - vel.x;
        const tailY = pos.y - vel.y;

        const gradient = ctx.createLinearGradient(tailX, tailY, pos.x, pos.y);
        gradient.addColorStop(0, "rgba(255, 200, 100, 0)");
        gradient.addColorStop(1, entity.color);

        ctx.save();
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.restore();
    }
}
