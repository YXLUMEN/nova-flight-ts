import type {EntityRenderer} from "./EntityRenderer.ts";
import type {SpawnMarkerEntity} from "../../../entity/SpawnMarkerEntity.ts";

export class SpawnMarkerEntityRender implements EntityRenderer<SpawnMarkerEntity> {
    public render(entity: SpawnMarkerEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        const pos = entity.getPositionRef;
        const size = entity.getWidth();
        const gapRatio = 0.3;
        const half = size / 2;
        const gap = size * gapRatio;

        let alpha = 1;
        if (entity.age > 80) {
            const speed = 0.3 + (1 - entity.age / 180);
            alpha = 0.5 + 0.5 * Math.sin(entity.age * speed);
        }

        ctx.save();
        ctx.translate(pos.x + offsetX, pos.y + offsetY);
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgba(255,95,66,${alpha})`;

        // 顶边
        ctx.beginPath();
        ctx.moveTo(-half, -half);
        ctx.lineTo(-gap / 2, -half);
        ctx.moveTo(gap / 2, -half);
        ctx.lineTo(half, -half);
        ctx.stroke();

        // 右边
        ctx.beginPath();
        ctx.moveTo(half, -half);
        ctx.lineTo(half, -gap / 2);
        ctx.moveTo(half, gap / 2);
        ctx.lineTo(half, half);
        ctx.stroke();

        // 底边
        ctx.beginPath();
        ctx.moveTo(half, half);
        ctx.lineTo(gap / 2, half);
        ctx.moveTo(-gap / 2, half);
        ctx.lineTo(-half, half);
        ctx.stroke();

        // 左边
        ctx.beginPath();
        ctx.moveTo(-half, half);
        ctx.lineTo(-half, gap / 2);
        ctx.moveTo(-half, -gap / 2);
        ctx.lineTo(-half, -half);
        ctx.stroke();

        ctx.restore();
    }
}
