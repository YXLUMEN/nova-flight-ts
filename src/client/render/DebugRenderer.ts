import type {ViewRect} from "./Camera.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../../entity/Entity.ts";
import {concatIters} from "../../utils/uit.ts";
import {BitFlag} from "../../utils/BitFlag.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";

export class DebugRenderer {
    public render(ctx: CanvasRenderingContext2D, viewRect: ViewRect, flag: number, world: ClientWorld, alpha: number) {
        const entities = concatIters<Iterable<Entity>>(world.getEntities().values(), world.getPlayers());

        ctx.save();
        ctx.font = '14px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';

        for (const entity of entities) {
            if (!entity.shouldRender(viewRect)) continue;
            const pos = entity.getLerpPos(alpha);

            if (BitFlag.has(flag, DebugFlag.BOUNDING_BOX)) {
                this.renderBoundingBox(ctx, pos, entity, alpha);
            }
            if (BitFlag.has(flag, DebugFlag.HEALTH_BAR)) {
                this.renderHealthBar(ctx, pos, entity);
            }
        }
        ctx.restore();
    }

    private renderBoundingBox(ctx: CanvasRenderingContext2D, pos: Vec2, entity: Entity, alpha: number) {
        const yaw = entity.getLerpYaw(alpha);
        const lerpBox = entity.getDimensions().getBoxAtByVec(pos);

        const w = lerpBox.getWidth();
        const h = lerpBox.getHeight();

        ctx.beginPath();
        ctx.strokeStyle = "#2aff00";
        ctx.moveTo(pos.x, pos.y);
        ctx.lineTo(Math.cos(yaw) * (w + 20) + pos.x, Math.sin(yaw) * (h + 20) + pos.y);
        ctx.stroke();

        ctx.strokeStyle = "#fff";
        ctx.strokeRect(lerpBox.minX, lerpBox.minY, w, h);
    }

    private renderHealthBar(ctx: CanvasRenderingContext2D, pos: Vec2, entity: Entity) {
        if (!(entity instanceof LivingEntity)) return;
        const {halfHeight} = entity.getDimensions();

        ctx.fillStyle = '#ff0000';
        ctx.fillText(`${entity.getHealth()} / ${entity.getMaxHealth()}`, pos.x, pos.y + halfHeight + 16);

        const shield = entity.getShieldAmount();
        if (shield === 0) return;

        ctx.fillStyle = 'rgb(80 149 255 / 0.8)';
        ctx.fillText(`${shield} / ${entity.getMaxShield()}`, pos.x, pos.y + halfHeight + 32);
    }
}

export const enum DebugFlag {
    BOUNDING_BOX = 1 << 0,
    HEALTH_BAR = 1 << 1,
}