import {isBoxInView} from "../../utils/render/render.ts";
import {EntityRenderers} from "./entity/EntityRenderers.ts";
import {PI2} from "../../utils/math/math.ts";
import {RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {ViewRect} from "./Camera.ts";
import type {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {Entity} from "../../entity/Entity.ts";

export class EntityRenderer {
    private readonly client: NovaFlightClient;

    public constructor(client: NovaFlightClient) {
        this.client = client;
    }

    public renderMainPlayer(ctx: CanvasRenderingContext2D, world: ClientWorld, player: ClientPlayerEntity, alpha: number) {
        if (world.isOver()) return

        if (player.renderer === null) {
            player.renderer = EntityRenderers.getRenderer(player);
        }

        player.renderer.render(player, ctx, alpha);
        player.bc?.drawAimIndicator(ctx, alpha);

        const playerPos = player.getLerpPos(alpha);
        if (player.lockedMissile.size > 0) {
            ctx.fillStyle = '#ff7f50';
            for (const missile of player.lockedMissile) {
                if (player.approachMissile.has(missile)) continue;
                this.renderLockedDir(ctx, missile, playerPos, 8, 6, 6, alpha);
            }
        }

        if (player.approachMissile.size > 0) {
            const t = performance.now() * 0.01;
            ctx.globalAlpha = (Math.sin(t * PI2) + 1) / 2;
            ctx.fillStyle = '#ff1b1b';
            for (const missile of player.approachMissile) {
                this.renderLockedDir(ctx, missile, playerPos, 10, 6, 8, alpha);
            }
            ctx.globalAlpha = 1;
        }

        if (player.followPointer && RuntimeConfig.cameraFollow) {
            const pointer = player.input.getWorldPointer();
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(playerPos.x, playerPos.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
        }
    }

    public renderOtherPlayer(ctx: CanvasRenderingContext2D, viewRect: ViewRect, world: ClientWorld, alpha: number) {
        for (const player of world.getPlayers()) {
            if (player === this.client.player) continue;

            const bound = player.getBoundingBox();
            if (!isBoxInView(bound, viewRect)) continue;

            if (player.renderer === null) {
                player.renderer = EntityRenderers.getRenderer(player);
            }
            player.renderer.render(player, ctx, alpha);
        }
    }

    public renderEntities(ctx: CanvasRenderingContext2D, viewRect: ViewRect, world: ClientWorld, alpha: number) {
        for (const entity of world.getEntities().values()) {
            if (!entity.shouldRender(viewRect)) continue;

            if (entity.renderer === null) {
                entity.renderer = EntityRenderers.getRenderer(entity);
            }
            entity.renderer.render(entity, ctx, alpha);
        }
    }

    public renderDebug(ctx: CanvasRenderingContext2D, viewRect: ViewRect, world: ClientWorld, alpha: number) {
        for (const entity of world.getEntities().values()) {
            if (!entity.shouldRender(viewRect)) continue;
            this.renderBoundingBox(ctx, entity, alpha);
        }
        for (const player of world.getPlayers()) {
            this.renderBoundingBox(ctx, player, alpha);
        }
    }

    private renderBoundingBox(ctx: CanvasRenderingContext2D, entity: Entity, tickDelta: number) {
        const pos = entity.getLerpPos(tickDelta);
        const yaw = entity.getLerpYaw(tickDelta);
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

    private renderLockedDir(
        ctx: CanvasRenderingContext2D,
        missile: Entity,
        playerPos: Vec2,
        tipLength: number, wingWidth: number, wingHeight: number,
        alpha: number
    ) {
        const mPos = missile.getLerpPos(alpha);
        const dx = mPos.x - playerPos.x;
        const dy = mPos.y - playerPos.y;
        const angle = Math.atan2(dy, dx);
        const arrowX = playerPos.x + Math.cos(angle) * 64;
        const arrowY = playerPos.y + Math.sin(angle) * 64;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(tipLength, 0);
        ctx.lineTo(-wingHeight, wingWidth);
        ctx.lineTo(-wingHeight, -wingWidth);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}