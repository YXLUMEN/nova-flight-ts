import {Input} from "./Input.ts";
import {PlayerEntity} from "./entity/PlayerEntity.ts";
import {BulletEntity} from "./entity/BulletEntity.ts";
import {Camera} from "./Camera.ts";
import {Vec2} from "./math/Vec2.ts";
import {collideCircle, DPR, playSound, rand} from "./math/uit.ts";
import type {MobEntity} from "./entity/MobEntity.ts";
import {EventBus} from "./event/EventBus.ts";
import type {Effect} from "./effect/Effect.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {ScreenFlash} from "./effect/ScreenFlash.ts";
import {StarField} from "./effect/StarField.ts";
import {layers} from "./configs.ts";
import {UI} from "./ui/UI.ts";
import {BaseEnemy} from "./entity/BaseEnemy.ts";

export class Game {
    public static instance: Game;
    public static canvas = document.getElementById("game") as HTMLCanvasElement;
    public static ctx = Game.canvas.getContext("2d")!;
    public static W = 800;
    public static H = 600;

    public readonly ui: UI;
    public readonly camera: Camera = new Camera();
    public readonly events: EventBus = new EventBus();

    private last = 0;
    private accumulator = 0;
    private readonly fixedDt = 1 / 120;

    public input = new Input(Game.canvas);
    public player = new PlayerEntity(this.input);

    public effects: Effect[] = [];
    public mobs: MobEntity[] = [];
    public bullets: BulletEntity[] = [];

    private starField: StarField;

    public over = false;
    public ticking = true;
    public rendering = true;
    public spawnTimer = 0;

    constructor() {
        this.resize();
        this.registryEvents();

        this.starField = new StarField(128, layers, 8);
        this.starField.init(this.camera);

        window.addEventListener("resize", () => this.resize());

        window.addEventListener("keydown", (e) => {
            const k = e.key.toLowerCase();
            if (k === "enter" && this.over) this.reset();
            else if (k === "p" || k === 'escape') this.togglePause();
            else if (k === "v") this.player.invincible = !this.player.invincible;
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.ticking = false;
                this.rendering = false;
            } else if (document.visibilityState === 'visible') {
                this.rendering = true;
            }
        });

        window.addEventListener('contextmenu', event => event.preventDefault());

        this.ui = new UI(this, {
            pauseHint: "按 P/Esc 继续",
            getWeaponUI: (w, key) => ({
                label: (w.displayName ?? key).toUpperCase(),
                color: w.uiColor ?? "#a0a0a0",
                cooldown: w.cooldown,
                maxCooldown: w.CD,
                order: w.uiOrder ?? 99,
            }),
        });

        this.loop(0);
        playSound('/public/audio/successful_hit.wav').catch();
    }

    public reset() {
        this.mobs = [];
        this.bullets = [];
        this.player = new PlayerEntity(this.input);

        this.over = false;
        this.ticking = true;
        this.rendering = true;
        this.spawnTimer = 0;

        this.starField.init(this.camera);
        playSound('/public/audio/successful_hit.wav').catch();
    }

    public togglePause() {
        if (this.over) return;
        this.ticking = !this.ticking;
    }

    public resize() {
        const rect = Game.canvas.getBoundingClientRect();

        Game.canvas.width = Math.floor(rect.width * DPR);
        Game.canvas.height = Math.floor(rect.height * DPR);

        Game.W = Math.floor(rect.width);
        Game.H = Math.floor(rect.height);

        Game.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    public loop(ts: number) {
        const dt = Math.min(0.033, (ts - this.last) / 1000 || 0);
        this.last = ts;
        this.accumulator += dt;

        while (this.accumulator >= this.fixedDt) {
            this.update(this.fixedDt);
            this.accumulator -= this.fixedDt;
        }
        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }

    public update(dt: number) {
        if (!this.ticking) return;

        // 镜头跟随
        this.camera.update(this.player.pos, dt);

        // 背景
        this.starField.update(dt, this.camera);

        // 玩家
        this.player.update(dt);

        // 敌人生成
        this.spawnTimer -= dt;
        const spawnInterval = Math.max(0.25, 1.1 - this.player.score * 0.01);
        if (this.spawnTimer <= 0) {
            this.mobs.push(new BaseEnemy(new Vec2(rand(24, Game.W - 24), -30)));
            this.spawnTimer = spawnInterval;
        }

        this.mobs.forEach(mob => mob.update(dt));
        this.bullets.forEach(b => b.update(dt));
        this.effects.forEach(e => e.update(dt));

        // 碰撞: 子弹
        for (const bullet of this.bullets) {
            if (bullet.isDead) continue;
            for (const mob of this.mobs) {
                if (mob.isDead || !collideCircle(bullet, mob)) continue;
                if (bullet.owner && (mob === bullet.owner)) continue;

                mob.onDamage(1);
                bullet.onDeath();
                if (mob.isDead) this.events.emit('mob-killed', mob);
                break;
            }
        }

        // 碰撞: 玩家
        for (const mob of this.mobs) {
            if (mob.isDead || !collideCircle(this.player, mob)) continue;
            if (this.player.invincible) break;

            mob.onDeath();
            this.player.onDamage(1);
            if (this.player.isDead) {
                this.gameOver();
                break;
            }
        }

        // 清理
        this.mobs = this.mobs.filter(e => !e.isDead);
        this.bullets = this.bullets.filter(b => !b.isDead);
        this.effects = this.effects.filter(e => e.alive);
    }

    public gameOver() {
        this.over = true;
        this.effects.push(new ScreenFlash(1, 0.25, '#ff0000'));
        setTimeout(() => {
            this.ticking = false;
        }, 500);
    }

    public render() {
        if (!this.rendering) return;

        const ctx = Game.ctx;
        ctx.clearRect(0, 0, Game.W, Game.H);

        this.starField.render(ctx, this.camera);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.viewOffset.x), -Math.floor(this.camera.viewOffset.y));

        // 背景层
        this.drawBackground(ctx);

        // 实体
        this.mobs.forEach((e) => e.render(ctx));
        this.bullets.forEach((b) => b.render(ctx));
        if (!this.player.isDead) this.player.render(ctx);
        this.effects.forEach(e => e.render(ctx));

        ctx.restore();

        this.ui.render(ctx);
    }

    public drawBackground(ctx: CanvasRenderingContext2D) {
        ctx.save();

        const v = this.camera.viewRect;

        // 网格
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = "#89b7ff";
        const gridSize = 80;

        const startX = Math.floor(v.left / gridSize) * gridSize;
        const endX = Math.ceil(v.right / gridSize) * gridSize;
        for (let x = startX; x <= endX; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, v.top);
            ctx.lineTo(x, v.bottom);
            ctx.stroke();
        }

        const startY = Math.floor(v.top / gridSize) * gridSize;
        const endY = Math.ceil(v.bottom / gridSize) * gridSize;
        for (let y = startY; y <= endY; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(v.left, y);
            ctx.lineTo(v.right, y);
            ctx.stroke();
        }

        // 边界线
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "#e6f0ff";
        ctx.beginPath();
        ctx.rect(0, 0, Game.W, Game.H);
        ctx.stroke();

        ctx.restore();
    }

    private registryEvents() {
        this.events.clear();

        this.events.on('mob-killed', (event: MobEntity) => {
            this.player.score += event.getWorth;
        });

        this.events.on('bomb-detonate', ({pos, radius, shake, sparks, flash}) => {
            BombWeapon.spawnExplosionVisual(this, pos, {radius, sparks});
            if (shake) this.camera.addShake(shake);
            if (flash) this.effects.push(flash);
        });

        this.events.on('emp-detonate', () => {
            this.effects.push(new ScreenFlash(0.5, 0.18, '#5ec8ff'));
        });
    }
}