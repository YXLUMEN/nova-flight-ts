import type {BulletEntity} from "../../../entity/projectile/BulletEntity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import type {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";

export class FastBulletEntityRender implements EntityRenderer<FastBulletEntity> {
    public render(entity: BulletEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getLerpPos(tickDelta);
        const x = pos.x + offsetX;
        const y = pos.y + offsetY;
        const tailX = x - entity.getVelocityRef.x;
        const tailY = y - entity.getVelocityRef.y;

        ctx.save();
        const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
        gradient.addColorStop(0, 'rgba(166,166,166,0)');
        gradient.addColorStop(1, entity.color);

        ctx.strokeStyle = gradient;
        ctx.lineWidth = entity.getWidth();
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
    }
}