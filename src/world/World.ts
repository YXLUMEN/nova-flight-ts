import {type Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {IEffect} from "../effect/IEffect.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StarField} from "../effect/StarField.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {ParticlePool} from "../effect/ParticlePool.ts";
import type {Schedule, TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {collideEntityCircle, HALF_PI} from "../utils/math/math.ts";
import {defaultLayers} from "../configs/StarfieldConfig.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DefaultEvents} from "../event/DefaultEvents.ts";
import {EVENTS, type IEvents} from "../apis/IEvents.ts";
import {EntityList} from "./EntityList.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import type {Stage} from "../stage/Stage.ts";
import {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {AtomicInteger} from "../utils/math/AtomicInteger.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {WorldScreen} from "../render/WorldScreen.ts";
import {NovaFlightClient} from "../client/NovaFlightClient.ts";
import {type EntityHandler, ServerEntityManager} from "./ServerEntityManager.ts";
import {EntityType} from "../entity/EntityType.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {NetworkChannel} from "../network/NetworkChannel.ts";
import type {Payload} from "../network/Payload.ts";

export class World implements NbtSerializable {
    public static instance: World | null;

    public static readonly WORLD_W = 1692;
    public static readonly WORLD_H = 1030;

    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    private readonly registryManager: RegistryManager;
    private readonly networkHandler: NetworkChannel;
    private readonly worldSound = new SoundSystem();

    private readonly damageSources: DamageSources;
    // ticking
    private over = false;
    public freeze = false;
    private ticking = false;
    public rendering = true;
    public peaceMod = false;
    // schedule
    private time = 0;
    private nextTimerId = new AtomicInteger();
    private timers: TimerTask[] = [];
    // game
    public stage = STAGE;
    private effects: IEffect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);
    // entity
    public player: PlayerEntity | null;
    private readonly entities: EntityList = new EntityList();
    private readonly entityManager: ServerEntityManager<Entity>;

    protected constructor(registryManager: RegistryManager) {
        this.registryManager = registryManager;

        this.networkHandler = NovaFlightClient.networkHandler;
        this.damageSources = new DamageSources(registryManager);
        this.entityManager = new ServerEntityManager(this.ServerEntityHandler);

        this.player = new PlayerEntity(this, NovaFlightClient.input);
        this.player.setPosition(WorldScreen.VIEW_W / 2, WorldScreen.VIEW_H);
        this.entityManager.addEntity(this.player, true);

        this.registryEvents();

        this.starField.init();
    }

    public static createWorld(registryManager: RegistryManager): World {
        if (this.instance) return this.instance;
        this.instance = new World(registryManager);
        return this.instance;
    }

    public destroy(): void {
        this.clear();

        this.events.clear();
        World.instance = null;
    }

    public clear(): void {
        this.timers.length = 0;
        this.time = 0;
        this.nextTimerId.reset();
        this.stage.reset();

        this.player!.discard();
        this.player = null;
        this.entities.forEach(entity => entity.discard());
        this.entities.clear();
        this.entityManager.clear();

        this.effects.forEach(effect => effect.kill());
        this.effects.length = 0;

        this.worldSound.stopAll();
        SoundSystem.globalSound.stopAll();
    }

    public reset(): void {
        this.clear();

        this.player = new PlayerEntity(this, NovaFlightClient.input);
        this.player.setPosition(WorldScreen.VIEW_W / 2, WorldScreen.VIEW_H);
        this.player.setVelocity(0, -24);
        this.entityManager.addEntity(this.player, true);

        this.over = false;
        this.rendering = true;

        this.starField.init();
    }

    public tickWorld(tickDelta: number) {
        if (!this.ticking) return;

        WorldScreen.hud.tick(tickDelta);

        const dt = this.freeze ? 0 : tickDelta;
        const player = this.player!;

        WorldScreen.camera.update(player.getPositionRef.clone(), tickDelta, player.voidEdge);

        // 阶段更新
        this.stage.tick(this);

        // 更新实体
        if (!this.over) player.tick();
        for (const entity of this.entities.values()) {
            if (entity.isRemoved() || this.freeze) continue;
            this.tickEntity(entity, player);
            if (this.over) break;
        }
        this.entities.processRemovals();

        if (this.empBurst > 0) this.empBurst -= 1;

        // 效果更新
        this.effects.forEach(effect => effect.tick(dt));
        if (this.effects.length > 0) for (let i = this.effects.length; i--;) {
            if (!this.effects[i].isAlive()) {
                this.effects.splice(i, 1);
            }
        }

        this.particlePool.tick(dt);
        this.starField.update(dt, WorldScreen.camera);

        NovaFlightClient.input.updateEndFrame();

        this.time += dt;
        this.processTimers();
    }

    private tickEntity(entity: Entity, player: PlayerEntity) {
        entity.tick();

        // 敌方碰撞
        if (entity instanceof MobEntity) {
            if (player.invulnerable || WorldConfig.devMode || !collideEntityCircle(player, entity)) return;
            entity.attack(player);
            return;
        }

        // 弹射物碰撞
        if (entity instanceof ProjectileEntity) {
            const owner = entity.getOwner();
            // 敌方命中
            if (owner instanceof MobEntity) {
                if (player.invulnerable || WorldConfig.devMode || !collideEntityCircle(player, entity)) return;

                entity.onEntityHit(player);
                return;
            }

            // 玩家近防炮命中
            if (entity instanceof CIWSBulletEntity) {
                for (const projectile of this.getProjectiles()) {
                    if (projectile.getOwner() !== owner && collideEntityCircle(entity, projectile)) {
                        entity.onEntityHit(projectile);
                        projectile.onEntityHit(entity);
                        return;
                    }
                }
            }

            // 玩家命中
            for (const mob of this.getMobs()) {
                if (collideEntityCircle(entity, mob)) {
                    entity.onEntityHit(mob);
                    return;
                }
            }
        }
    }

    public get isTicking(): boolean {
        return this.ticking;
    }

    public get isOver(): boolean {
        return this.over;
    }

    public togglePause(): void {
        if (this.over) return;
        this.setTicking(!this.ticking);
    }

    public toggleTechTree() {
        const ticking = this.rendering = document.getElementById('tech-shell')!.classList.toggle('hidden');
        this.setTicking(ticking);
    }

    public gameOver() {
        this.over = true;
        this.effects.push(new ScreenFlash(1, 0.25, '#ff0000'));
        this.schedule(1, () => {
            this.setTicking(false);
            this.rendering = false;

            const ctrl = new AbortController();
            window.addEventListener('keydown', ({code}) => {
                if (code === "Enter" && this.over && !this.ticking && !this.rendering) {
                    ctrl.abort();
                    this.reset();
                    return;
                }
            }, {signal: ctrl.signal});
        });
    }

    public addEffect(effect: IEffect) {
        this.effects.push(effect);
    }

    public setStage(stage: Stage) {
        this.getMobs().forEach(m => m.discard());
        this.stage.reset();
        this.stage = stage;
    }

    public getDamageSources(): DamageSources {
        return this.damageSources;
    }

    public getRegistryManager(): RegistryManager {
        return this.registryManager;
    }

    public getNetworkHandler() {
        return this.networkHandler;
    }

    public sendPacket(payload: Payload) {
        this.networkHandler.send(payload);
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

    public spawnEntity(entity: Entity): boolean {
        if (this.peaceMod && entity instanceof MobEntity) {
            return false;
        }
        if (entity.isRemoved()) {
            console.warn(`Tried to add entity ${EntityType.getId(entity.getType())} but it was marked as removed already`);
            return false;
        }

        return this.entityManager.addEntity(entity);
    }

    public getEntities(): EntityList {
        return this.entities;
    }

    public getMobs(): ReadonlySet<MobEntity> {
        return this.entities.getMobs();
    }

    public getProjectiles(): ReadonlySet<ProjectileEntity> {
        return this.entities.getProjectiles();
    }

    public getEntity(uuid: string): Entity | null {
        return this.entityManager.getIndex().getByUUID(uuid);
    }

    public schedule(delaySec: number, fn: () => void): Schedule {
        const t: TimerTask = {
            id: this.nextTimerId.incrementAndGet(),
            at: this.time + Math.max(0, delaySec),
            fn,
            repeat: false,
            canceled: false
        };
        this.insertTimer(t);
        return {
            id: t.id,
            cancel: () => t.canceled = true
        };
    }

    public scheduleInterval(intervalSec: number, fn: () => void): Schedule {
        const t: TimerTask = {
            id: this.nextTimerId.incrementAndGet(),
            at: this.time + Math.max(0, intervalSec),
            fn,
            repeat: true,
            interval: Math.max(0, intervalSec),
            canceled: false
        };
        this.insertTimer(t);
        return {
            id: t.id,
            cancel: () => t.canceled = true
        };
    }

    public getTime(): number {
        return this.time;
    }

    public isPeaceMode(): boolean {
        return this.peaceMod;
    }

    public setTicking(ticking = true): void {
        if (ticking) {
            AudioManager.resume();
            SoundSystem.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.worldSound.resumeAll().catch(console.error);
        } else {
            AudioManager.pause();
            SoundSystem.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
            this.worldSound.pauseAll().catch(console.error);
        }
        this.ticking = ticking;
    }

    public playSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playSound(event, volume, pitch);
    }

    public playLoopSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playLoopSound(event, volume, pitch);
    }

    public stopLoopSound(event: SoundEvent): boolean {
        return this.worldSound.stopLoopSound(event);
    }

    public nextPhase() {
        this.stage.nextPhase();
    }

    public pausePhase() {
        this.stage.pause();
    }

    public render() {
        if (!this.rendering) return;

        const ctx = WorldScreen.ctx;
        ctx.clearRect(0, 0, WorldScreen.VIEW_W, WorldScreen.VIEW_H);

        this.starField.render(ctx, WorldScreen.camera);

        ctx.save();
        const offset = WorldScreen.camera.viewOffset;
        ctx.translate(-offset.x, -offset.y);

        // 背景层
        this.drawBackground(ctx);

        // 其他实体
        if (this.player?.voidEdge) {
            this.wrapEntityRender(ctx);
        } else {
            this.entities.forEach(entity => {
                EntityRenderers.getRenderer(entity).render(entity, ctx);
            });
        }

        // 特效
        for (let i = 0; i < this.effects.length; i++) this.effects[i].render(ctx);
        this.particlePool.render(ctx);

        // 玩家
        if (!this.over && this.player) {
            EntityRenderers.getRenderer(this.player).render(this.player, ctx);

            if (this.player.lockedMissile.size > 0) {
                for (const missile of this.player.missilePos) {
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

        WorldScreen.hud.render(ctx);
        WorldScreen.notify.render(ctx);
        if (!this.ticking) WorldScreen.pauseOverlay.render(ctx);
    }

    private wrapEntityRender(ctx: CanvasRenderingContext2D) {
        const margin = WorldScreen.VIEW_W / 2;

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
        const v = WorldScreen.camera.viewRect;

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
        if (this.player?.voidEdge) {
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

    // 二分插入 保持 timers 按 at 升序
    private insertTimer(t: TimerTask) {
        let lo = 0, hi = this.timers.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.timers[mid].at <= t.at) lo = mid + 1;
            else hi = mid;
        }
        this.timers.splice(lo, 0, t);
    }

    private processTimers() {
        while (this.timers.length && this.timers[0].at <= this.time) {
            const t = this.timers.shift()!;
            if (t.canceled) continue;

            if (!t.repeat) {
                t.fn();
                continue;
            }

            // 重复任务,补齐到当前世界时间; 可能在长时间卡顿时触发多次
            if (t.interval! <= 0) {
                t.fn();
                continue;
            } // 容错
            do {
                t.fn();
                t.at += t.interval!;
            } while (t.at <= this.time && !t.canceled);

            if (!t.canceled) this.insertTimer(t);
        }
    }

    private registryEvents() {
        this.events.clear();

        this.events.on(EVENTS.ENTITY_REMOVED, event => {
            this.entityManager.remove(event.entity);
        });

        let bossEvent = false;
        this.events.on(EVENTS.BOSS_KILLED, event => {
            if (bossEvent || BossEntity.hasBoss) return;
            bossEvent = true;

            if (event.mob) this.stage.nextPhase();

            this.schedule(120, () => {
                if (BossEntity.hasBoss) return;

                const stage = this.stage;
                stage.reset();
                while (true) {
                    const stageName = stage.getCurrentName();
                    if (stageName === 'P6' || stageName === 'mP3' || stageName === null) break;
                    stage.nextPhase();
                }

                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, this, 64);
                boss.setPosition(World.WORLD_W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, this, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                this.spawnEntity(mark);
                bossEvent = false;
            });
        });

        DefaultEvents.registryEvents(this);
    }

    public writeNBT(root: NbtCompound): NbtCompound {
        const playerNbt = new NbtCompound();
        this.player!.writeNBT(playerNbt);
        root.putCompound('Player', playerNbt);

        const entityList: NbtCompound[] = [];
        this.entities.forEach(entity => {
            if (!entity.shouldSave()) return;

            const nbt = new NbtCompound();
            const type = EntityType.getId(entity.getType())!;
            nbt.putString('Type', type.toString());
            entity.writeNBT(nbt);
            entityList.push(nbt);
        });
        root.putCompoundList('Entities', entityList);

        const stageNbt = new NbtCompound();
        this.stage.writeNBT(stageNbt);
        root.putCompound('Stage', stageNbt);

        return root;
    }

    public readNBT(nbt: NbtCompound) {
        const playerNbt = nbt.getCompound('Player');
        if (playerNbt) this.player!.readNBT(playerNbt);

        const entityNbt = nbt.getCompoundList('Entities');
        if (entityNbt) this.loadEntity(entityNbt);

        const stageNbt = nbt.getCompound('Stage');
        if (stageNbt) this.stage.readNBT(stageNbt);

        if (this.player!.getPhaseScore() >= 2048) {
            this.events.emit(EVENTS.BOSS_KILLED, {mob: null, damageSource: this.damageSources.generic()});
        }
    }

    private loadEntity(nbtList: NbtCompound[]) {
        for (const nbt of nbtList) {
            const typeName = nbt.getString('Type');
            const entityType = EntityType.get(typeName);
            if (!entityType) continue;

            const entity = entityType.create(this) as Entity;
            entity.readNBT(nbt);
            this.spawnEntity(entity);
        }
    }

    public saveAll(): NbtCompound {
        const root = new NbtCompound();
        this.writeNBT(root);
        return root;
    }

    public readonly ServerEntityHandler: EntityHandler<Entity> = {
        startTicking: (entity: Entity) => {
            this.entities.add(entity);
        },

        stopTicking: (entity: Entity) => {
            this.entities.remove(entity);
        },
    };
}