import {KeyboardInput} from "../input/KeyboardInput.ts";
import {type Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Camera} from "../render/Camera.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {Effect} from "../effect/Effect.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StarField} from "../effect/StarField.ts";
import {UI} from "../render/ui/UI.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {DPR} from "../utils/uit.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {ParticlePool} from "../effect/ParticlePool.ts";
import type {Schedule, TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {collideEntityBox, collideEntityCircle} from "../utils/math/math.ts";
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

export class World {
    private static worldInstance: World;
    private static canvas = document.getElementById("game") as HTMLCanvasElement;
    private static ctx = World.canvas.getContext("2d")!;

    public static W = 800;
    public static H = 600;

    public readonly camera: Camera = new Camera();
    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    private readonly registryManager: RegistryManager;
    private readonly ui: UI = new UI(this);
    private readonly input = new KeyboardInput(World.canvas);
    private readonly damageSources: DamageSources;
    // ticking
    private last = 0;
    private accumulator = 0;
    private over = false;
    private freeze = false;
    private ticking = true;
    private rendering = true;
    // schedule
    private time = 0;
    private nextTimerId = 1;
    private timers: TimerTask[] = [];
    // game
    private stage = STAGE;
    private effects: Effect[] = [];
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

        World.resize();
        this.player = new PlayerEntity(this, this.input);
        this.player?.setPosition(World.W / 2, World.H);

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

    public static get instance(): World {
        return this.worldInstance;
    }

    public static getCtx() {
        return this.ctx;
    }

    public static resize() {
        const rect = this.canvas.getBoundingClientRect();

        this.canvas.width = Math.floor(rect.width * DPR);
        this.canvas.height = Math.floor(rect.height * DPR);

        this.W = Math.floor(rect.width);
        this.H = Math.floor(rect.height);

        this.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    public start(): void {
        this.tick(0);
    }

    private tick(ts: number) {
        const tickDelta = Math.min(0.05, (ts - this.last) / 1000 || 0);
        this.last = ts;
        this.accumulator += tickDelta;

        while (this.accumulator >= WorldConfig.mbps) {
            if (this.ticking) this.tickWorld(WorldConfig.mbps);
            this.accumulator -= WorldConfig.mbps;
        }
        this.render();
        requestAnimationFrame(t => this.tick(t));
    }

    private tickWorld(tickDelta: number) {
        this.ui.tick(tickDelta);

        const dt = this.freeze ? 0 : tickDelta;
        const player = this.player!;
        const yaw = player.getYaw();
        const forwardX = Math.cos(yaw) * 200;
        const forwardY = Math.sin(yaw) * 200;
        this.camera.update(player.getPositionRef.clone().add(forwardX, forwardY), tickDelta);

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
        if (this.effects.length > 0) {
            for (let i = this.effects.length; i--;) {
                if (!this.effects[i].isAlive()) {
                    this.effects.splice(i, 1);
                }
            }
        }

        this.particlePool.tick(dt);
        this.starField.update(dt, this.camera);

        this.input.updateEndFrame();

        this.time += dt;
        this.processTimers();
    }

    private tickEntity(entity: Entity, player: PlayerEntity) {
        entity.tick();

        // 敌方碰撞
        if (entity instanceof MobEntity) {
            if (player.invulnerable || WorldConfig.devMode || !collideEntityBox(player, entity)) return;
            entity.attack(player);
            return;
        }

        // 弹射物碰撞
        if (entity instanceof ProjectileEntity) {
            if (entity.owner instanceof MobEntity) {
                if (player.invulnerable || WorldConfig.devMode || !collideEntityBox(player, entity)) return;

                entity.onEntityHit(player);
                if (this.over) return;
            }
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

    public reset(): void {
        this.player!.discard();
        this.loadedMobs.clear();

        // 安全起见
        this.entities.forEach(entity => entity.discard());
        this.entities.clear();

        this.effects.forEach(effect => effect.kill());
        this.effects.length = 0;

        this.stage.reset();

        this.player = new PlayerEntity(this, this.input);
        this.player.setPosition(World.W / 2, World.H);
        this.player.setVelocity(0, -24);

        this.over = false;
        this.rendering = true;
        this.setTicking(true);

        this.starField.init();
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
            window.addEventListener('keypress', ({code}) => {
                if (code === "Enter" && this.over && !this.ticking && !this.rendering) {
                    ctrl.abort();
                    this.reset();
                    return;
                }
            }, {signal: ctrl.signal});
        });
    }

    public addEffect(effect: Effect) {
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

    public spawnEntity(entity: Entity) {
        if (entity instanceof MobEntity) {
            if (this.peaceMod) return;
            this.loadedMobs.add(entity);
        }
        this.entities.add(entity);
    }

    public getEntities(): EntityList {
        return this.entities;
    }

    public getLoadMobs(): Set<MobEntity> {
        return this.loadedMobs;
    }

    public schedule(delaySec: number, fn: () => void): Schedule {
        const t: TimerTask = {
            id: this.nextTimerId++,
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
            id: this.nextTimerId++,
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
            SoundSystem.resumeAll().catch(console.error);
        } else {
            SoundSystem.pauseAll().catch(console.error);
        }
        this.ticking = ticking;
    }

    public render() {
        if (!this.rendering) return;

        const ctx = World.ctx;
        ctx.clearRect(0, 0, World.W, World.H);

        this.starField.render(ctx, this.camera);

        ctx.save();
        const offset = this.camera.viewOffset;
        ctx.translate(-offset.x, -offset.y);

        // 背景层
        this.drawBackground(ctx);

        // 其他实体
        this.entities.forEach(entity => {
            EntityRenderers.getRenderer(entity).render(entity, ctx);
        });

        // 特效
        for (let i = 0; i < this.effects.length; i++) this.effects[i].render(ctx);
        this.particlePool.render(ctx);

        // 玩家
        if (!this.over && this.player) {
            EntityRenderers.getRenderer(this.player).render(this.player, ctx);
        }

        ctx.restore();

        this.ui.render(ctx);
    }

    public drawBackground(ctx: CanvasRenderingContext2D) {
        const v = this.camera.viewRect;

        // 网格
        const gridSize = 80;

        const startX = Math.floor(v.left / gridSize) * gridSize;
        const endX = Math.ceil(v.right / gridSize) * gridSize;
        const startY = Math.floor(v.top / gridSize) * gridSize;
        const endY = Math.ceil(v.bottom / gridSize) * gridSize;

        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = "#89b7ff";

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
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#e6f0ff";
        ctx.beginPath();
        ctx.rect(0, 0, World.W, World.H);
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
                const stage = this.stage;
                stage.reset();
                while (true) {
                    const stageName = stage.getCurrentName();
                    if (stageName === 'P6' || stageName === 'mP3' || stageName === null) break;
                    stage.nextPhase();
                }

                if (BossEntity.hasBoss) return;
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, this, 64);
                boss.setPosition(World.W / 2, 64);

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
        mainWindow.listen('tauri://blur', () => this.setTicking(false)).then();
        mainWindow.listen('tauri://resize', async () => {
            this.rendering = !await mainWindow.isMinimized();
        }).then();

        this.input.onKeyDown(this.registryInput.bind(this));

        // 实际可视页面变化
        window.addEventListener("resize", () => World.resize());

        window.addEventListener('contextmenu', event => event.preventDefault());
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
                this.camera.cameraOffset.set(0, 0);
                break;
        }
    }
}