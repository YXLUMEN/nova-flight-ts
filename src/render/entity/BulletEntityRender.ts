import {type BulletEntity} from "../../entity/projectile/BulletEntity.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import {PI2} from "../../utils/math/math.ts";

export class BulletEntityRender implements EntityRenderer<BulletEntity> {
    public render(entity: BulletEntity, ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.beginPath();
        ctx.arc(entity.getMutPos.x, entity.getMutPos.y, entity.getBoxRadius(), 0, PI2);
        ctx.fill();
        ctx.restore();
    }
}