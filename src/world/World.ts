import {KeyboardInput} from "../input/KeyboardInput.ts";
import {type Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {IEffect} from "../effect/IEffect.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StarField} from "../effect/StarField.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
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
import {mainWindow} from "../main.ts";
import {EntityList} from "./EntityList.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import type {Stage} from "../stage/Stage.ts";
import {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {AtomicInteger} from "../utils/math/AtomicInteger.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {WorldScreen} from "../render/WorldScreen.ts";

export class World implements NbtSerializable {
    public static readonly globalSound = new SoundSystem();
    private static worldInstance: World;

    public static readonly WORLD_W = 1692;
    public static readonly WORLD_H = 1030;

    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    private readonly registryManager: RegistryManager;
    private readonly input = new KeyboardInput(WorldScreen.canvas);
    private readonly worldSound = new SoundSystem();

    private readonly damageSources: DamageSources;
    // ticking
    private over = false;
    private freeze = false;
    private ticking = true;
    public rendering = true;
    // schedule
    private time = 0;
    private nextTimerId = new AtomicInteger();
    private timers: TimerTask[] = [];
    // game
    private stage = STAGE;
    private effects: IEffect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);
    // entity
    public player: PlayerEntity | null;
    private loadedMobs = new Set<MobEntity>();
    private entities: EntityList = new EntityList();
    private peaceMod = false;

    protected constructor(registryManager: RegistryManager) {
        this.registryManager = registryManager;
        this.damageSources = new DamageSources(registryManager);

        this.player = new PlayerEntity(this, this.input);
        this.player?.setPosition(World.WORLD_W / 2, World.WORLD_H);

        this.registryListeners();
        this.registryEvents();

        this.starField.init();
    }

    public static createWorld(registryManager: RegistryManager): World {
        if (this.worldInstance) return this.worldInstance;
        this.worldInstance = new World(registryManager);
        this.worldInstance.setTicking(false);
        return this.worldInstance;
    }

    public static get instance(): World | null {
        return this.worldInstance;
    }

    public destroy(): void {
        this.clear();

        this.input.clearKeyHandler();
        this.events.clear();
    }

    public clear(): void {
        this.timers.length = 0;
        this.time = 0;
        this.nextTimerId.reset();
        this.stage.reset();

        this.player!.discard();
        this.player = null;
        this.loadedMobs.clear();
        this.entities.forEach(entity => entity.discard());
        this.entities.clear();

        this.effects.forEach(effect => effect.kill());
        this.effects.length = 0;

        this.worldSound.stopAll();
        World.globalSound.stopAll();
    }

    public reset(): void {
        this.clear();

        this.player = new PlayerEntity(this, this.input);
        this.player.setPosition(World.WORLD_W / 2, World.WORLD_H);
        this.player.setVelocity(0, -24);

        this.over = false;
        this.rendering = true;

        this.starField.init();
    }

    public tickWorld(tickDelta: number) {
        if (!this.ticking) return;

        WorldScreen.hud.tick(tickDelta);

        const dt = this.freeze ? 0 : tickDelta;
        const player = this.player!;

        WorldScreen.camera.update(player.getPositionRef.clone(), tickDelta);

        // 阶段更新
        this.stage.tick(this);

        // 更新实体
        if (!this.over) player.tick();
        this.entities.forEach(entity => {
            if (!entity.isRemoved() && !this.freeze) this.tickEntity(entity, player);
            if (this.over) return;
        });
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

        this.input.updateEndFrame();

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
            // 敌方命中
            if (entity.owner instanceof MobEntity) {
                if (player.invulnerable || WorldConfig.devMode || !collideEntityCircle(player, entity)) return;

                entity.onEntityHit(player);
                return;
            }

            // 近防炮命中
            if (entity instanceof CIWSBulletEntity) {
                for (const entity2 of this.entities.values()) {
                    if (entity2.invulnerable || entity2 === entity.owner) continue;
                    // 抵消弹射物
                    if (entity2 instanceof ProjectileEntity) {
                        if (entity2.owner === entity.owner) continue;
                        if (collideEntityCircle(entity, entity2)) {
                            entity.onEntityHit(entity2);
                            entity2.onEntityHit(entity);
                            break;
                        }
                        continue;
                    }
                    // 正常命中
                    if (collideEntityCircle(entity, entity2)) {
                        entity.onEntityHit(entity2);
                        break;
                    }
                }
                return;
            }

            // 玩家命中
            for (const mob of this.loadedMobs) {
                if (collideEntityCircle(entity, mob)) {
                    entity.onEntityHit(mob);
                    break;
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

    private toggleTechTree() {
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
        this.loadedMobs.forEach(m => m.discard());
        this.stage.reset();
        this.stage = stage;
    }

    public getDamageSources(): DamageSources {
        return this.damageSources;
    }

    public getRegistryManager(): RegistryManager {
        return this.registryManager;
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

    public spawnEntity(entity: Entity): void {
        if (entity instanceof MobEntity) {
            if (this.peaceMod) return;
            this.loadedMobs.add(entity);
        }
        this.entities.add(entity);
    }

    public getEntities(): EntityList {
        return this.entities;
    }

    public getLoadMobs(): Readonly<Set<MobEntity>> {
        return this.loadedMobs;
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
            World.globalSound.playSound(SoundEvents.UI_PAGE_SWITCH);
            this.worldSound.resumeAll().catch(console.error);
        } else {
            AudioManager.pause();
            World.globalSound.playSound(SoundEvents.UI_BUTTON_PRESSED);
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
        this.entities.forEach(entity => {
            EntityRenderers.getRenderer(entity).render(entity, ctx);
        })

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
        ctx.beginPath();
        ctx.rect(0, 0, World.WORLD_W, World.WORLD_H);
        ctx.stroke();

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
            const entity = event.entity;
            this.entities.remove(entity);

            if (entity instanceof MobEntity) {
                this.loadedMobs.delete(entity);
            }
        });

        this.events.on(EVENTS.BOSS_KILLED, () => {
            this.stage.nextPhase();

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
            });
        });

        DefaultEvents.registryEvents(this);
    }

    private registryInput(event: KeyboardEvent) {
        const code = event.code;

        if (event.ctrlKey) {
            if (code === 'KeyV') {
                WorldConfig.devMode = !WorldConfig.devMode;
                WorldConfig.usedDevMode = true;
            }
            if (WorldConfig.devMode) this.devMode(code);
            return;
        }

        switch (code) {
            case 'F11':
                mainWindow.isFullscreen()
                    .then(isFull => mainWindow.setFullscreen(!isFull))
                    .catch(console.error);
                break;
            case 'KeyT':
                WorldConfig.autoShoot = !WorldConfig.autoShoot;
                break;
            case 'Escape': {
                const techTree = document.getElementById('tech-shell')!;
                if (!techTree.classList.contains('hidden')) {
                    this.toggleTechTree();
                    return;
                }
                this.togglePause();
                break;
            }
            case 'KeyG':
                this.toggleTechTree();
                break;
            case 'KeyM':
                document.getElementById('help')?.classList.toggle('hidden');
                this.setTicking(false);
                break;
        }
    }

    private registryListeners() {


        this.input.onKeyDown('world_input', this.registryInput.bind(this));
    }

    private devMode(code: string) {
        const player = this.player;
        if (!player) return;
        switch (code) {
            case 'KeyK':
                player.addPhaseScore(200);
                break;
            case 'KeyC':
                this.peaceMod = !this.peaceMod;
                this.peaceMod ? this.stage.pause() : this.stage.resume();
                this.loadedMobs.forEach(mob => mob.discard());
                break;
            case 'KeyH':
                player.setHealth(player.getMaxHealth());
                break;
            case 'KeyO':
                player.techTree.unlockAll(this);
                break;
            case 'KeyL':
                this.stage.nextPhase();
                break;
            case 'KeyF':
                this.freeze = !this.freeze;
                break;
            case 'NumpadSubtract':
                WorldConfig.enableCameraOffset = !WorldConfig.enableCameraOffset;
                WorldScreen.camera.cameraOffset.set(0, 0);
                break;
            case 'KeyS':
                NovaFlightServer.saveGame(this.saveAll())
                    .then(() => {
                        this.gameOver();
                        this.reset();
                    });
                break;
            case 'KeyP':
                localStorage.removeItem('guided');
                break;
        }
    }

    public writeNBT(root: NbtCompound): NbtCompound {
        const playerNbt = new NbtCompound();
        this.player!.writeNBT(playerNbt);
        root.putCompound('Player', playerNbt);

        const stageNbt = new NbtCompound();
        this.stage.writeNBT(stageNbt);
        root.putCompound('Stage', stageNbt);

        return root;
    }

    public readNBT(nbt: NbtCompound) {
        const playerNbt = nbt.getCompound('Player');
        if (playerNbt) this.player!.readNBT(playerNbt);

        const stageNbt = nbt.getCompound('Stage');
        if (stageNbt) this.stage.readNBT(stageNbt);
    }

    public saveAll(): NbtCompound {
        const root = new NbtCompound();
        this.writeNBT(root);
        return root;
    }
}