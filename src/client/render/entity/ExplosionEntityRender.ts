import type {EntityRenderer} from "./EntityRenderer.ts";
import type {ExplosionEntity} from "../../../entity/ExplosionEntity.ts";
import {PI2} from "../../../utils/math/math.ts";

export class ExplosionEntityRender implements EntityRenderer<ExplosionEntity> {
    public render(entity: ExplosionEntity, ctx: CanvasRenderingContext2D): void {
        const {x, y} = entity.positionRef;
        const r = entity.visual.radius;

        let alpha = 1;
        if (entity.countdown - entity.age < 20) {
            alpha = 0.5 + 0.5 * Math.sin(entity.age);
        }

        ctx.save();
        ctx.fillStyle = `rgba(255,0,0,${0.3 * alpha})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255,0,0,${alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, PI2);
        ctx.stroke();

        ctx.restore();
    }
}