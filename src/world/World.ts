import {Input} from "../Input.ts";
import {type Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Camera} from "../render/Camera.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {EventBus} from "../event/EventBus.ts";
import type {Effect} from "../effect/Effect.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StarField} from "../effect/StarField.ts";
import {UI} from "../render/ui/UI.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {DPR} from "../utils/uit.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {ParticlePool} from "../effect/ParticlePool.ts";
import type {TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {collideEntityBox, collideEntityCircle} from "../utils/math/math.ts";
import {defaultLayers} from "../configs/StarfieldConfig.ts";
import {EntityRenderers} from "../render/entity/EntityRenderers.ts";
import {DefaultEvents} from "../event/DefaultEvents.ts";
import {EVENTS, type IEvents} from "../apis/IEvents.ts";
import {mainWindow} from "../main.ts";
import {EntityList} from "../entity/EntityList.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class World {
    private static worldInstance: World;
    private static canvas = document.getElementById("game") as HTMLCanvasElement;
    private static ctx = World.canvas.getContext("2d")!;

    public static W = 800;
    public static H = 600;

    public readonly camera: Camera = new Camera();
    public readonly events: EventBus<IEvents> = EventBus.getEventBus();
    public empBurst: number = 0

    private readonly registryManager: RegistryManager;
    private readonly ui: UI = new UI(this);
    private readonly input = new Input(World.canvas);
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
    private readonly stage = STAGE;
    private effects: Effect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);
    // entity
    public player: PlayerEntity | null;
    private loadedMobs = new Set<MobEntity>();
    private entities: EntityList = new EntityList();

    protected constructor(registryManager: RegistryManager) {
        this.registryManager = registryManager;
        this.damageSources = new DamageSources(registryManager);
        this.player = new PlayerEntity(this, this.input);

        this.resize();
        this.registryListeners();
        this.registryEvents();

        this.starField.init();
    }

    public start(): void {
        this.tick(0);
    }

    public static createWorld(registryManager: RegistryManager): World {
        if (this.worldInstance) return this.worldInstance;
        this.worldInstance = new World(registryManager);
        this.worldInstance.ticking = false;
        return this.worldInstance;
    }

    public static get instance(): World {
        return this.worldInstance;
    }

    private tick(ts: number) {
        const tickDelta = Math.min(0.05, (ts - this.last) / 1000 || 0);
        this.last = ts;
        this.accumulator += tickDelta;

        while (this.accumulator >= WorldConfig.mbps) {
            if (this.ticking) this.update(WorldConfig.mbps);
            this.accumulator -= WorldConfig.mbps;
        }
        this.render();
        requestAnimationFrame(t => this.tick(t));
    }

    private update(tickDelta: number) {
        const dt = this.freeze ? 0 : tickDelta;
        const player = this.player!;

        this.ui.tick(tickDelta);

        const yaw = player.getYaw();
        const forwardX = Math.cos(yaw) * 200;
        const forwardY = Math.sin(yaw) * 200;
        this.camera.update(player.getMutPosition.clone().add(forwardX, forwardY), tickDelta);

        // 阶段更新
        this.stage.update(this, dt);

        // 更新实体
        if (!this.over) player.tick();

        for (const entity of this.entities.iterate()) {
            if (entity.isRemoved()) continue;
            if (dt > 0) entity.tick();

            // 敌方碰撞
            if (entity instanceof MobEntity) {
                if (player.invulnerable || WorldConfig.devMode || !collideEntityBox(player, entity)) continue;
                entity.attack(player);
                if (this.over) break;
                continue;
            }

            // 弹射物碰撞
            if (entity instanceof ProjectileEntity) {
                if (entity.owner instanceof MobEntity) {
                    if (player.invulnerable || WorldConfig.devMode || !collideEntityBox(player, entity)) continue;

                    entity.onEntityHit(player);
                    if (this.isOver) break;
                    continue;
                }
                for (const mob of this.loadedMobs) {
                    if (collideEntityCircle(entity, mob)) {
                        entity.onEntityHit(mob);
                        break;
                    }
                }
            }
        }

        if (this.empBurst > 0) this.empBurst -= 1;

        // 效果更新
        this.effects.forEach(effect => effect.tick(dt));
        if (this.effects.length > 0) {
            for (let i = this.effects.length; i--;) {
                if (!this.effects[i].alive) {
                    this.effects.splice(i, 1);
                }
            }
        }

        this.particlePool.tick(dt);
        this.starField.update(dt, this.camera);

        this.input.updateEndFrame();

        this.time += dt;
        this.processTimers();
        // console.log('All', this.entities.size, 'mobs', this.loadedMobs.size);
    }

    public get isTicking(): boolean {
        return this.ticking;
    }

    public get isOver(): boolean {
        return this.over;
    }

    public reset(): void {
        this.entities.clear();
        this.loadedMobs.clear();
        this.effects.length = 0;

        this.player?.techTree.destroy();
        this.player = new PlayerEntity(this, this.input);

        this.over = false;
        this.ticking = true;
        this.rendering = true;
        this.stage.reset();

        this.starField.init();
    }

    public togglePause(): void {
        if (this.over) return;
        this.ticking = !this.ticking;
    }

    private toggleTechTree() {
        this.ticking = this.rendering = document.getElementById('tech-shell')!.classList.toggle('hidden');
    }

    private resize() {
        const rect = World.canvas.getBoundingClientRect();

        World.canvas.width = Math.floor(rect.width * DPR);
        World.canvas.height = Math.floor(rect.height * DPR);

        World.W = Math.floor(rect.width);
        World.H = Math.floor(rect.height);

        World.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    public gameOver() {
        this.over = true;
        this.effects.push(new ScreenFlash(1, 0.25, '#ff0000'));
        this.schedule(1, () => {
            this.ticking = false
        });
    }

    public addEffect(effect: Effect) {
        this.effects.push(effect);
    }

    public getDamageSources(): DamageSources {
        return this.damageSources;
    }

    public getRegistryManager(): RegistryManager {
        return this.registryManager;
    }

    public spawnParticle(
        pos: IVec, vel: IVec,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ): void {
        this.particlePool.spawn(pos.clone() as MutVec2, vel.clone() as MutVec2, life, size, colorFrom, colorTo, drag, gravity);
    }

    public spawnEntity(entity: Entity) {
        if (entity instanceof MobEntity) {
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

    public schedule(delaySec: number, fn: () => void): { id: number; cancel: () => void } {
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

    public scheduleInterval(intervalSec: number, fn: () => void): { id: number; cancel: () => void } {
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

            this.schedule(50, () => {
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, this, 64);
                boss.setPosition(World.W / 2, 64);
                this.spawnEntity(boss);
            });
        });

        DefaultEvents.registryEvents(this);
    }

    private registryListeners() {
        mainWindow.listen('tauri://blur', () => this.ticking = false).then();
        mainWindow.listen('tauri://resize', async () => {
            this.rendering = !await mainWindow.isMinimized();
        }).then();

        // 实际可视页面变化
        window.addEventListener("resize", () => this.resize());

        window.addEventListener("keydown", e => {
            const code = e.code;

            if (e.ctrlKey) {
                e.preventDefault();
                if (code === "KeyV") {
                    WorldConfig.devMode = !WorldConfig.devMode;
                    WorldConfig.usedDevMode = true;
                }
                if (WorldConfig.devMode) this.devMode(code);
                return;
            }

            if (code === "Enter" && this.over) this.reset();
            else if (code === "KeyP" || code === 'Escape') this.togglePause();
            else if (code === 'KeyG') this.toggleTechTree();
            else if (code === 'KeyM') {
                document.getElementById('help')?.classList.toggle('hidden');
                this.ticking = false;
            }
        });

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