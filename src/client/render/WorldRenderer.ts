import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {clamp, lerp} from "../../utils/math/math.ts";
import {Window} from "./Window.ts";
import type {ClientWorld} from "../ClientWorld.ts";
import {defaultLayers} from "../../configs/StarfieldConfig.ts";
import {StarField} from "../../effect/StarField.ts";
import type {VisualEffect} from "../../effect/VisualEffect.ts";
import {EntityRenderers} from "./entity/EntityRenderers.ts";
import {World} from "../../world/World.ts";
import type {ParticleEffectType} from "../../effect/ParticleEffectType.ts";
import {BlockMapRender} from "./BlockMapRender.ts";
import type {TitleEffect} from "../../effect/TitleEffect.ts";
import {ParticlePool} from "../../effect/ParticlePool.ts";
import type {HexColor} from "../../type/types.ts";
import {EntityRenderer} from "./EntityRenderer.ts";
import {GlobalConfig} from "../../configs/GlobalConfig.ts";

export class WorldRenderer {
    private readonly client: NovaFlightClient;
    private readonly window: Window;

    private world: ClientWorld | null = null;

    private readonly entityRenderer: EntityRenderer;
    private readonly effects: VisualEffect[] = [];
    private readonly particlePool: ParticlePool;
    private readonly starField: StarField;

    private title: TitleEffect | null = null;
    private mapRender: BlockMapRender | null = null;

    public rendering = true;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.window = client.window;

        this.entityRenderer = new EntityRenderer(client);
        this.particlePool = new ParticlePool(1024);
        this.starField = new StarField(128, defaultLayers, 8);
        this.starField.init();
    }

    public setWorld(world: ClientWorld | null) {
        this.world = world;

        EntityRenderers.clearCache();
        this.effects.forEach(effect => effect.kill());
        this.effects.length = 0;
        this.particlePool.clear();
        this.mapRender?.dispose();
        this.mapRender = world === null ? null : new BlockMapRender(world.getMap());
    }

    public tick(dt: number) {
        const camera = this.client.window.camera;
        if (this.client.player) {
            camera.tick(this.client.player.getLerpPos(dt), dt);
        }

        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.tick(dt);
            if (effect.isAlive()) continue;
            this.effects[i] = this.effects[this.effects.length - 1];
            this.effects.pop();
        }

        if (this.title) {
            this.title.tick(dt);
            if (!this.title.isAlive()) this.title = null;
        }
        this.particlePool.tick(dt);
        this.starField.update(dt, camera);
        this.window.damagePopup.tick(dt);
    }

    public addParticle(
        x: number, y: number,
        vx: number, vy: number,
        life: number,
        halfW: number, halfH: number,
        type: number,
        colorFrom: HexColor, colorTo?: HexColor,
        drag?: number
    ) {
        this.particlePool.spawn(
            x, y,
            vx, vy,
            life,
            halfW, halfH,
            type,
            colorFrom, colorTo,
            drag
        );
    }

    public addPreparedParticle(
        type: ParticleEffectType,
        x: number, y: number,
        count: number,
        baseAngle?: number
    ) {
        count = clamp(Math.floor(count), 0, 255);
        this.particlePool.spawnEffect(type, x, y, count, baseAngle);
    }

    public addEffect(effect: VisualEffect) {
        this.effects.push(effect);
    }

    public setTitle(title: TitleEffect) {
        this.title = title;
    }

    public render(alpha: number) {
        if (!this.rendering) return;

        const ctx = this.window.ctx;
        ctx.clearRect(0, 0, Window.viewWidth, Window.viewHeight);

        this.starField.render(ctx, this.window.camera, alpha);

        const camera = this.window.camera;
        const viewRect = camera.viewRect;
        const offset = camera.viewOffset;
        const lastOffset = camera.lastViewOffset;
        const ox = lerp(alpha, lastOffset.x, offset.x);
        const oy = lerp(alpha, lastOffset.y, offset.y);

        ctx.save();
        ctx.translate(-ox, -oy);

        // 背景层
        this.renderBackground(ctx);
        if (!this.world) {
            ctx.restore();
            return;
        }

        this.mapRender!.render(ctx, viewRect);

        const world = this.world;
        this.entityRenderer.renderEntities(ctx, viewRect, world, alpha);

        // 特效
        for (let i = 0; i < this.effects.length; i++) {
            this.effects[i].render(ctx, alpha);
        }
        this.particlePool.render(ctx, alpha);

        // 其他玩家
        this.entityRenderer.renderOtherPlayer(ctx, viewRect, world, alpha);

        // 主要玩家
        const player = this.client.player;
        if (player) this.entityRenderer.renderMainPlayer(ctx, world, player, alpha);

        if (GlobalConfig.renderHitBox) {
            this.entityRenderer.renderDebug(ctx, viewRect, world, alpha);
        }

        this.window.hud.renderMainWeapon(ctx, alpha);
        this.window.damagePopup.render(ctx, alpha);
        ctx.restore();

        this.title?.render(ctx);
        this.window.hud.render(ctx);
        if (this.client.isPause() && !world.isOver() && (player && !player.isOpenInventory())) {
            this.window.pauseOverlay.render(ctx);
        }

        this.window.notify.render(ctx);
        this.window.hud.renderPointer(ctx, this.client);
    }

    private renderBackground(ctx: CanvasRenderingContext2D) {
        const v = this.window.camera.viewRect;

        // 网格
        const gridSize = 80;

        const startX = Math.floor(v.left / gridSize) * gridSize;
        const endX = Math.ceil(v.right / gridSize) * gridSize;
        const startY = Math.floor(v.top / gridSize) * gridSize;
        const endY = Math.ceil(v.bottom / gridSize) * gridSize;

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
        ctx.rect(0, 0, World.MAP_WIDTH, World.MAP_HEIGHT);
        ctx.stroke();
    }

    public onBlockChange(): void {
        this.mapRender?.markDirty();
    }
}