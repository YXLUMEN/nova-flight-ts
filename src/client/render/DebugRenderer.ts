import type {ViewRect} from "./Camera.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {Flags} from "../../utils/collection/Flags.ts";
import {concatIters} from "../../utils/util.ts";
import {toFixedTrim} from "../../utils/math/math.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";

export class DebugRenderer {
    public render(ctx: CanvasRenderingContext2D, viewRect: ViewRect, flag: Flags, world: ClientWorld, alpha: number) {
        const entities = concatIters(world.getEntities().iter(), world.getPlayers());
        const boundingBox = flag.has(DebugFlag.BOUNDING_BOX);
        const stretch = flag.has(DebugFlag.STRETCH_BOX);
        const healthBar = flag.has(DebugFlag.HEALTH_BAR);

        ctx.save();
        ctx.font = '14px system-ui, -apple-system, Segoe HUD, Roboto, sans-serif';
        for (const entity of entities) {
            if (!entity.shouldRender(viewRect)) continue;
            const pos = entity.getLerpPos(alpha);

            if (boundingBox) this.renderBoundingBox(ctx, pos, entity, alpha, stretch);
            if (healthBar) this.renderHealthBar(ctx, pos, entity);
        }
        ctx.restore();
    }

    private renderBoundingBox(ctx: CanvasRenderingContext2D, pos: Vec2, entity: Entity, alpha: number, stretch: boolean) {
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

        if (!stretch) return;
        const stretchBox = lerpBox.stretchByVec(entity.velocityRef);
        ctx.strokeStyle = "#ffe95a";
        ctx.strokeRect(stretchBox.minX, stretchBox.minY, stretchBox.getWidth(), stretchBox.getHeight());
    }

    private renderHealthBar(ctx: CanvasRenderingContext2D, pos: Vec2, entity: Entity) {
        if (!(entity instanceof LivingEntity)) return;
        const {halfHeight} = entity.getDimensions();

        ctx.fillStyle = '#ff0000';
        ctx.fillText(`${toFixedTrim(entity.getHealth(), 3)} / ${entity.getMaxHealth()}`, pos.x, pos.y + halfHeight + 16);

        const shield = entity.getShieldAmount();
        if (shield === 0) return;

        ctx.fillStyle = 'rgb(80 149 255 / 0.8)';
        ctx.fillText(`${toFixedTrim(shield, 3)} / ${entity.getMaxShield()}`, pos.x, pos.y + halfHeight + 32);
    }
}

export const enum DebugFlag {
    BOUNDING_BOX = 1 << 0,
    STRETCH_BOX = 1 << 1,
    HEALTH_BAR = 1 << 2,
}