import type {Entity} from "../../entity/Entity.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {HALF_PI, lerp, PI2} from "../../utils/math/math.ts";
import {Window} from "./Window.ts";
import {isBoxInView} from "../../utils/render/render.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import {defaultLayers} from "../../configs/StarfieldConfig.ts";
import {StarField} from "../../effect/StarField.ts";
import {ParticlePool} from "../../effect/ParticlePool.ts";
import type {VisualEffect} from "../../effect/VisualEffect.ts";
import {EntityRenderers} from "./entity/EntityRenderers.ts";
import {GlobalConfig} from "../../configs/GlobalConfig.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {World} from "../../world/World.ts";
import {BitBlockMap} from "../../world/map/BitBlockMap.ts";
import type {ParticleEffectType} from "../../effect/ParticleEffectType.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export class WorldRender {
    private readonly client: NovaFlightClient;
    private world: ClientWorld | null = null;

    public rendering = true;
    private readonly effects: VisualEffect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.starField.init();
    }

    public setWorld(world: ClientWorld | null) {
        this.world = world;
        this.effects.forEach(effect => effect.kill());
    }

    public tick(dt: number) {
        const camera = this.client.window.camera;
        if (this.client.player) {
            camera.update(this.client.player.getLerpPos(dt), dt);
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.tick(dt);
            if (effect.isAlive()) continue;
            this.effects[i] = this.effects[this.effects.length - 1];
            this.effects.pop();
        }

        this.particlePool.tick(dt);
        this.starField.update(dt, camera);
        this.client.window.damagePopup.tick(dt);
    }

    public addParticle(
        pos: Vec2, vel: Vec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0
    ) {
        this.particlePool.spawn(
            pos, vel,
            life, size,
            colorFrom, colorTo,
            drag
        );
    }

    public addPreparedParticle(type: ParticleEffectType, pos: Vec2, count: number, baseAngle: number = 0) {
        this.particlePool.spawnEffect(type, pos, count, baseAngle);
    }

    public addEffect(effect: VisualEffect) {
        this.effects.push(effect);
    }

    public render(tickDelta: number) {
        if (!this.rendering) return;

        const ctx = this.client.window.ctx;
        ctx.clearRect(0, 0, Window.VIEW_W, Window.VIEW_H);

        this.starField.render(ctx, this.client.window.camera, tickDelta);

        const viewRect = this.client.window.camera.viewRect;
        const offset = this.client.window.camera.viewOffset;
        const lastOffset = this.client.window.camera.lastViewOffset;
        const ox = lerp(tickDelta, lastOffset.x, offset.x);
        const oy = lerp(tickDelta, lastOffset.y, offset.y);

        ctx.save();
        ctx.translate(-ox, -oy);

        // 背景层
        this.renderBackground(ctx);
        if (!this.world) {
            ctx.restore();
            return;
        }

        this.renderBlocks(ctx);

        for (const entity of this.world.getEntities().values()) {
            if (!entity.shouldRender(viewRect)) continue;

            if (entity.renderer === null) {
                entity.renderer = EntityRenderers.getRenderer(entity);
            }
            entity.renderer.render(entity, ctx, tickDelta);
        }

        // 特效
        for (let i = 0; i < this.effects.length; i++) {
            this.effects[i].render(ctx, tickDelta);
        }
        this.particlePool.render(ctx, tickDelta);

        // 其他玩家
        for (const player of this.world.getPlayers()) {
            if (player === this.client.player) continue;

            const bound = player.getBoundingBox();
            if (!isBoxInView(bound, viewRect)) continue;

            if (player.renderer === null) {
                player.renderer = EntityRenderers.getRenderer(player);
            }
            player.renderer.render(player, ctx, tickDelta);
        }

        // 主要玩家
        const player = this.client.player;
        if (!this.world.isOver && player) {
            if (player.renderer === null) {
                player.renderer = EntityRenderers.getRenderer(player);
            }

            player.renderer.render(player, ctx, tickDelta);
            player.bc?.drawAimIndicator(ctx, tickDelta);

            const playerPos = player.getLerpPos(tickDelta);
            if (player.lockedMissile.size > 0) {
                ctx.fillStyle = '#ff7f50';
                for (const missile of player.lockedMissile) {
                    if (player.approachMissile.has(missile)) continue;
                    this.renderLockedDir(ctx, missile, playerPos, 8, 6, 6, tickDelta);
                }
            }

            if (player.approachMissile.size > 0) {
                const t = performance.now() * 0.01;
                const pulse = (Math.sin(t * PI2) + 1) / 2;
                ctx.fillStyle = `rgba(255,27,27,${0.35 + 0.45 * pulse})`;
                for (const missile of player.approachMissile) {
                    this.renderLockedDir(ctx, missile, playerPos, 10, 6, 8, tickDelta);
                }
            }

            if (player.followPointer && GlobalConfig.cameraFollow) {
                const pointer = player.input.getWorldPointer();
                ctx.strokeStyle = '#fff';
                ctx.beginPath();
                ctx.moveTo(playerPos.x, playerPos.y);
                ctx.lineTo(pointer.x, pointer.y);
                ctx.stroke();
            }
        }

        if (GlobalConfig.renderHitBox) {
            for (const entity of this.world.getEntities().values()) {
                if (!entity.shouldRender(viewRect)) continue;
                this.renderBoundingBox(ctx, entity, tickDelta);
            }
            for (const player of this.world.getPlayers()) {
                this.renderBoundingBox(ctx, player, tickDelta);
            }
        }

        this.client.window.hud.renderMainWeapon(ctx, tickDelta);
        this.client.window.damagePopup.render(ctx, tickDelta);
        ctx.restore();

        this.client.window.hud.render(ctx);
        if (this.client.isPause() && !this.world.isOver && (player && !player.isOpenInventory())) {
            this.client.window.pauseOverlay.render(ctx);
        }
        this.client.window.hud.renderPointer(ctx, this.client);
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
        missile: MissileEntity,
        playerPos: Vec2,
        tipLength: number, wingWidth: number, wingHeight: number,
        tickDelta: number
    ) {
        const mPos = missile.getLerpPos(tickDelta);
        const dx = mPos.x - playerPos.x;
        const dy = mPos.y - playerPos.y;
        const angle = Math.atan2(dy, dx);
        const arrowX = playerPos.x + Math.cos(angle) * 64;
        const arrowY = playerPos.y + Math.sin(angle) * 64;

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle + HALF_PI);
        ctx.beginPath();
        ctx.moveTo(0, -tipLength);
        ctx.lineTo(wingWidth, wingHeight);
        ctx.lineTo(-wingWidth, wingHeight);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    private renderBackground(ctx: CanvasRenderingContext2D) {
        const v = this.client.window.camera.viewRect;

        // 网格
        const gridSize = 80;

        const startX = Math.floor(v.left / gridSize) * gridSize;
        const endX = Math.ceil(v.right / gridSize) * gridSize;
        const startY = Math.floor(v.top / gridSize) * gridSize;
        const endY = Math.ceil(v.bottom / gridSize) * gridSize;

        ctx.save();
        ctx.strokeStyle = "rgba(137,183,255,0.06)";

        ctx.beginPath();
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.moveTo(x, v.top);
            ctx.lineTo(x, v.bottom);
        }
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.moveTo(v.left, y);
            ctx.lineTo(v.right, y);
        }
        ctx.stroke();

        // 边界线
        ctx.strokeStyle = "rgba(230,240,255,0.3)";
        ctx.beginPath();
        ctx.rect(0, 0, World.WORLD_W, World.WORLD_H);
        ctx.stroke();

        ctx.restore();
    }

    private renderBlocks(ctx: CanvasRenderingContext2D) {
        const view = this.client.window.camera.viewRect;
        const blocksize = BitBlockMap.BLOCK_SIZE;
        const power = BitBlockMap.POWER;

        const blockMap = this.world!.getMap();

        const sx = Math.max(0, view.left >> power);
        const sy = Math.max(0, view.top >> power);
        const ex = Math.min(blockMap.getWidth(), (view.right + blocksize - 1) >> power);
        const ey = Math.min(blockMap.getHeight(), (view.bottom + blocksize - 1) >> power);

        ctx.fillStyle = '#555';
        for (let by = sy; by < ey; by++) {
            let bx = sx;
            while (bx < ex) {
                if (blockMap.get(bx, by) === 0) {
                    bx++;
                    continue;
                }

                const start = bx;
                while (bx < ex && blockMap.get(bx, by) !== 0) {
                    bx++;
                }
                ctx.fillRect(
                    start * blocksize,
                    by * blocksize,
                    (bx - start) * blocksize,
                    blocksize + 1
                );
            }
        }
    }
}