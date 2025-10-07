import type {EntityRenderer} from "./EntityRenderer.ts";
import type {BossEntity} from "../../../entity/mob/BossEntity.ts";

export class BossEntityRender implements EntityRenderer<BossEntity> {
    public render(entity: BossEntity, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        const pos = entity.getLerpPos(tickDelta);
        ctx.translate(pos.x + offsetX, pos.y + offsetY);

        ctx.fillStyle = entity.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(0, 144);
        ctx.lineTo(-112, -48);
        ctx.lineTo(0, -96);
        ctx.lineTo(122, -48);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}