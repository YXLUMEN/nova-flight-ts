import {Input} from "../Input.ts";
import {type Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Camera} from "../render/Camera.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {EventBus} from "../event/EventBus.ts";
import type {Effect} from "../effect/Effect.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {StarField} from "../effect/StarField.ts";
import {UI} from "../ui/UI.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {DPR} from "../utils/uit.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
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

export class World {
    public static instance: World;
    public static canvas = document.getElementById("game") as HTMLCanvasElement;
    public static ctx = World.canvas.getContext("2d")!;
    public static W = 800;
    public static H = 600;

    public readonly camera: Camera = new Camera();
    public readonly events: EventBus = new EventBus();
    public empBurst: number = 0
    public player: PlayerEntity;
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
    private time = 0;
    private nextTimerId = 1;
    private timers: TimerTask[] = [];
    private readonly stage = STAGE;
    private effects: Effect[] = [];
    private readonly particlePool: ParticlePool = new ParticlePool(256);
    private readonly starField: StarField = new StarField(128, defaultLayers, 8);
    private mobs: MobEntity[] = [];
    private bullets: ProjectileEntity[] = [];

    private constructor(registryManager: RegistryManager) {
        this.registryManager = registryManager;
        this.damageSources = new DamageSources(registryManager);
        this.player = new PlayerEntity(this, this.input);

        this.resize();
        this.registryListeners();
        this.registryEvents();

        this.starField.init(this.camera);

        this.loop(0);
    }

    public get isTicking(): boolean {
        return this.ticking;
    }

    public get isOver(): boolean {
        return this.over;
    }

    public static createWorld(registryManager: RegistryManager) {
        if (this.instance) return this.instance;
        this.instance = new World(registryManager);
        return this.instance;
    }

    private static renderEntity(entity: Entity): void {
        EntityRenderers.getRenderer(entity).render(entity, World.ctx);
    }

    public reset() {
        this.mobs.length = 0;
        this.bullets.length = 0;
        this.effects.length = 0;

        this.player.techTree.destroy();
        this.player = new PlayerEntity(this, this.input);

        this.over = false;
        this.ticking = true;
        this.rendering = true;
        this.stage.reset();

        this.starField.init(this.camera);
    }

    public togglePause() {
        if (this.over) return;
        this.ticking = !this.ticking;
    }

    public toggleTechTree() {
        this.ticking = this.rendering = document.getElementById('tech-shell')!.classList.toggle('hidden');
    }

    public resize() {
        const rect = World.canvas.getBoundingClientRect();

        World.canvas.width = Math.floor(rect.width * DPR);
        World.canvas.height = Math.floor(rect.height * DPR);

        World.W = Math.floor(rect.width);
        World.H = Math.floor(rect.height);

        World.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    public loop(ts: number) {
        const tickDelta = Math.min(0.05, (ts - this.last) / 1000 || 0);
        this.last = ts;
        this.accumulator += tickDelta;

        while (this.accumulator >= WorldConfig.mbps) {
            if (this.ticking) this.update(WorldConfig.mbps);
            this.accumulator -= WorldConfig.mbps;
        }
        this.render();
        requestAnimationFrame(t => this.loop(t));
    }

    public update(tickDelta: number) {
        const dt = this.freeze ? 0 : tickDelta;

        this.camera.update(this.player.getPos(), tickDelta);
        this.starField.update(dt, this.camera);

        if (!this.over) this.player.tick(tickDelta);

        this.stage.update(this, dt);

        this.mobs.forEach(mob => mob.tick(dt));
        this.bullets.forEach(b => b.tick(dt));
        this.effects.forEach(e => e.tick(dt));
        this.particlePool.tick(dt);

        // 碰撞: 子弹
        for (const bullet of this.bullets) {
            if (bullet.isRemoved()) continue;

            if (bullet.owner instanceof MobEntity) {
                if (this.player.invulnerable || WorldConfig.devMode || !collideEntityBox(this.player, bullet)) continue;

                bullet.onEntityHit(this.player);
                if (this.isOver) break;
            } else {
                for (const mob of this.mobs) {
                    if (mob.isRemoved() || !collideEntityCircle(bullet, mob)) continue;
                    bullet.onEntityHit(mob);
                    break;
                }
            }
        }
        if (this.empBurst > 0) this.empBurst -= 1;

        // 碰撞: 玩家
        for (const mob of this.mobs) {
            if (this.player.invulnerable || WorldConfig.devMode) break;
            if (mob.isRemoved() || !collideEntityBox(this.player, mob)) continue;

            mob.attack(this.player);
            if (this.isOver) break;
        }

        this.mobs = this.mobs.filter(e => !e.isRemoved());
        this.bullets = this.bullets.filter(b => !b.isRemoved());
        this.effects = this.effects.filter(e => e.alive);

        this.input.updateEndFrame();

        this.time += dt;
        this.processTimers();
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
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ): void {
        this.particlePool.spawn(pos.clone(), vel.clone(), life, size, colorFrom, colorTo, drag, gravity);
    }

    public spawnEntity(entity: Entity) {
        if (entity instanceof ProjectileEntity) {
            this.bullets.push(entity);
        } else if (entity instanceof MobEntity) {
            this.mobs.push(entity);
        }
    }

    public getMobs(): MobEntity[] {
        return this.mobs;
    }

    public getProjectiles(): ProjectileEntity[] {
        return this.bullets;
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
        ctx.translate(-Math.floor(offset.x), -Math.floor(offset.y));

        // 背景层
        this.drawBackground(ctx);

        // 实体
        this.mobs.forEach(World.renderEntity);
        this.bullets.forEach(World.renderEntity);

        this.effects.forEach(e => e.render(ctx));
        this.particlePool.render(ctx);

        if (!this.player.isRemoved()) World.renderEntity(this.player);

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

        this.events.on('boss-killed', (event) => {
            const boss = (event as any).mob;
            this.stage.nextPhase();
            if (boss instanceof MobEntity) {
                this.player.addPhaseScore(boss.getWorth());
            }
        });

        DefaultEvents.registryEvents(this);
    }

    private registryListeners() {
        window.addEventListener("resize", () => this.resize());

        window.addEventListener("keydown", e => {
            const code = e.code;

            // Dev mode
            if (e.ctrlKey) {
                e.preventDefault();
                if (code === "KeyV") WorldConfig.devMode = !WorldConfig.devMode;
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

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.ticking = false;
                this.rendering = false;
            } else {
                this.rendering = true;
            }
        });

        window.addEventListener('contextmenu', event => event.preventDefault());
    }

    private devMode(code: string) {
        switch (code) {
            case 'KeyK':
                this.player.addPhaseScore(200);
                break;
            case 'KeyC':
                this.mobs.length = 0;
                break;
            case 'KeyH':
                this.player.setHealth(this.player.getMaxHealth());
                break;
            case 'KeyO':
                this.player.techTree.unlockAll(this);
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