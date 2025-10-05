import {World} from "../world/World.ts";
import {type Entity} from "../entity/Entity.ts";
import {ClientEntityHandler} from "../world/ClientEntityHandler.ts";
import {EntityList} from "../world/EntityList.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import type {EntityHandler} from "../world/EntityHandler.ts";
import type {IEffect} from "../effect/IEffect.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {defaultLayers} from "../configs/StarfieldConfig.ts";
import {StarField} from "../effect/StarField.ts";
import {ParticlePool} from "../effect/ParticlePool.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {Window} from "./render/Window.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import {ClientPlayerEntity} from "./entity/ClientPlayerEntity.ts";
import {HALF_PI} from "../utils/math/math.ts";
import type {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import {StringPacket} from "../network/packet/StringPacket.ts";

export class ClientWorld extends World {
    private readonly client: NovaFlightClient = NovaFlightClient.getInstance();

    private readonly players = new Set<ClientPlayerEntity>();
    private readonly entities: EntityList = new EntityList();
    private readonly entityManager: ClientEntityHandler<Entity>;

    private readonly worldSound = new SoundSystem();

    // render
    public rendering = true;
    private readonly effects: IEffect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);

    public constructor(registryManager: RegistryManager) {
        super(registryManager, true);

        this.entityManager = new ClientEntityHandler(this.ClientEntityHandler);
        this.starField.init();

        const player = new ClientPlayerEntity(this, this.client.input);
        this.addEntity(player);
    }

    public override tick(dt: number) {
        super.tick(dt);

        this.tickEntities();
        this.starField.update(dt, this.client.window.camera);
    }

    public tickEntities() {
        this.players.values().forEach(player => {
            if (!player.isRemoved()) this.tickEntity(this.clientTickEntity, player);
        })
        this.entities.forEach(entity => {
            if (!entity.isRemoved()) this.tickEntity(this.clientTickEntity, entity);
        });
    }

    public getEntities() {
        return this.entities;
    }

    public getMobs() {
        return this.entities.getMobs();
    }

    public clientTickEntity(entity: Entity) {
        entity.age++;
        entity.tick();
    }

    public override getNetworkHandler(): ClientNetworkChannel {
        return this.client.networkHandler;
    }

    public override setTicking(ticking: boolean) {
        if (ticking && !this.isTicking) {
            AudioManager.resume();
            SoundSystem.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.worldSound.resumeAll().catch(console.error);
        } else if (this.isTicking) {
            AudioManager.pause();
            SoundSystem.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            this.worldSound.pauseAll().catch(console.error);
        }
        super.setTicking(ticking);
    }

    public override addEntity(entity: Entity): void {
        this.entityManager.addEntity(entity);
    }

    public override removeEntity(entityId: number): void {
        const entity = this.getEntityLookup().get(entityId);
        if (entity) {
            entity.discard();
        }
    }

    public override getEntityById(id: number): Entity | null {
        return this.getEntityLookup().get(id);
    }

    public override getEntityLookup() {
        return this.entityManager.getIndex();
    }

    public override playSound(sounds: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playSound(sounds, volume, pitch);
    }

    public override playLoopSound(sounds: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playLoopSound(sounds, volume, pitch);
    }

    public override stopLoopSound(event: SoundEvent): boolean {
        return this.worldSound.stopLoopSound(event);
    }

    public spawnParticleByVec(
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ): void {
        this.particlePool.spawn(
            pos, vel,
            life, size,
            colorFrom, colorTo,
            drag, gravity
        );
    }

    public spawnParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ) {
        this.particlePool.spawn(
            new MutVec2(posX, posY), new MutVec2(velX, velY),
            life, size,
            colorFrom, colorTo,
            drag, gravity
        );
    }

    public addEffect(effect: IEffect) {
        this.effects.push(effect);
    }

    public toggleTechTree() {
        const ticking = this.rendering = document.getElementById('tech-shell')!.classList.toggle('hidden');
        this.setTicking(ticking);
    }

    public render() {
        if (!this.rendering) return;

        const ctx = this.client.window.ctx;
        ctx.clearRect(0, 0, Window.VIEW_W, Window.VIEW_H);

        this.starField.render(ctx, this.client.window.camera);

        ctx.save();
        const offset = this.client.window.camera.viewOffset;
        ctx.translate(-offset.x, -offset.y);

        // 背景层
        this.drawBackground(ctx);

        // 其他实体
        if (this.client.player?.voidEdge) {
            this.wrapEntityRender(ctx);
        } else {
            this.players.forEach(player => {
                if (player === this.client.player) return;
                EntityRenderers.getRenderer(player).render(player, ctx);
            })
            this.entities.forEach(entity => {
                EntityRenderers.getRenderer(entity).render(entity, ctx);
            });
        }

        // 特效
        for (let i = 0; i < this.effects.length; i++) this.effects[i].render(ctx);
        this.particlePool.render(ctx);

        // 玩家
        const player = this.client.player;
        if (!this.over && player) {
            EntityRenderers.getRenderer(player).render(player, ctx);

            if (player.lockedMissile.size > 0) {
                for (const missile of player.missilePos) {
                    ctx.save();
                    ctx.translate(missile.x, missile.y);
                    ctx.rotate(missile.angle + HALF_PI);
                    ctx.beginPath();
                    ctx.moveTo(0, -10);
                    ctx.lineTo(6, 8);
                    ctx.lineTo(-6, 8);
                    ctx.closePath();
                    ctx.fillStyle = `#FF5050`;
                    ctx.fill();
                    ctx.restore();
                }
            }
        }

        ctx.restore();

        this.client.window.hud.render(ctx);
        this.client.window.notify.render(ctx);
        if (!this.ticking) this.client.window.pauseOverlay.render(ctx);
    }

    private wrapEntityRender(ctx: CanvasRenderingContext2D) {
        const margin = Window.VIEW_W / 2;

        this.entities.forEach(entity => {
            const renderer = EntityRenderers.getRenderer(entity);
            const pos = entity.getPositionRef;
            const width = entity.getWidth();

            renderer.render(entity, ctx);

            if (pos.x < margin + width) {
                renderer.render(entity, ctx, World.WORLD_W);
            }
            if (pos.x > World.WORLD_W - margin - width) {
                renderer.render(entity, ctx, -World.WORLD_W);
            }
        });
    }

    public drawBackground(ctx: CanvasRenderingContext2D) {
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
        if (this.client.player?.voidEdge) {
            ctx.beginPath();
            ctx.moveTo(-World.WORLD_W, 0);
            ctx.lineTo(World.WORLD_W * 2, 0);
            ctx.moveTo(-World.WORLD_W, World.WORLD_H);
            ctx.lineTo(World.WORLD_W * 2, World.WORLD_H);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.rect(0, 0, World.WORLD_W, World.WORLD_H);
            ctx.stroke();
        }

        ctx.restore();
    }

    public saveAll() {
        this.getNetworkHandler().send(new StringPacket('SaveAll'));
    }

    public stopServer() {
        this.getNetworkHandler().send(new StringPacket('StopServer'));
    }

    public readonly ClientEntityHandler: EntityHandler<Entity> = {
        startTicking: (entity: Entity) => {
            if (entity instanceof ClientPlayerEntity) {
                this.players.add(entity);
                return;
            }
            this.entities.add(entity);
        },

        stopTicking: (entity: Entity) => {
            if (entity instanceof ClientPlayerEntity) {
                this.players.delete(entity);
                return;
            }
            this.entities.remove(entity);
        },
    };
}