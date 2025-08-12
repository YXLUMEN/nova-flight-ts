import {Input} from "./Input.ts";
import {Player} from "./entity/Player.ts";
import {BaseEnemy} from "./entity/BaseEnemy.ts";
import {Bullet} from "./entity/Bullet.ts";
import {Star} from "./entity/Star.ts";
import {Camera} from "./Camera.ts";
import {Vec2} from "./math/Vec2.ts";
import {collideCircle, DPR, rand} from "./math/uit.ts";
import type {MobEntity} from "./entity/MobEntity.ts";
import {EventBus} from "./event/EventBus.ts";
import type {Effect} from "./effect/Effect.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {ScreenFlash} from "./effect/ScreenFlash.ts";

export class Game {
    public static instance: Game;
    public static canvas = document.getElementById("game") as HTMLCanvasElement;
    public static ctx = Game.canvas.getContext("2d")!;
    public static W = 800;
    public static H = 600;

    public readonly ui = document.getElementById("ui")!;
    public readonly camera: Camera = new Camera();
    public readonly events: EventBus = new EventBus();

    private last = 0;
    private accumulator = 0;
    private readonly fixedDt = 1 / 120;

    public input = new Input(Game.canvas);
    public player = new Player(this.input);

    public effects: Effect[] = [];

    public mobs: MobEntity[] = [];
    public bullets: Bullet[] = [];
    public stars: Star[] = [];

    public score = 0;
    public running = true;
    public spawnTimer = 0;

    constructor() {
        this.resize();
        this.registryEvents();

        window.addEventListener("resize", () => this.resize());

        // 星星背景
        for (let i = 0; i < 120; i++) this.stars.push(new Star());

        // 重开/暂停
        window.addEventListener("keydown", (e) => {
            const k = e.key.toLowerCase();
            if (k === "enter" && !this.running) this.reset();
            else if (k === "escape") this.togglePause();
            else if (k === "v") this.player.invincible = !this.player.invincible;
        });

        window.addEventListener('contextmenu', event => event.preventDefault());

        this.loop(0);
    }

    public reset() {
        this.mobs = [];
        this.bullets = [];
        this.player = new Player(this.input);
        this.score = 0;
        this.running = true;
        this.spawnTimer = 0;
    }

    public togglePause() {
        this.running = !this.running;
        if (!this.running) {
            this.ui.textContent = `暂停 · 分数 ${this.score} · 按 Esc 继续`;
        } else {
            this.ui.textContent = `分数 ${this.score}  ·  移动: WASD/方向键 或 拖拽  ·  射击: 空格/点按`;
        }
    }

    public resize() {
        const rect = Game.canvas.getBoundingClientRect();

        Game.canvas.width = Math.floor(rect.width * DPR);
        Game.canvas.height = Math.floor(rect.height * DPR);

        Game.W = Math.floor(rect.width);
        Game.H = Math.floor(rect.height);

        Game.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    private registryEvents() {
        this.events.clear();

        this.events.on('mob-killed', (event: MobEntity) => {
            this.score += event.score;
        });

        this.events.on('bomb-detonate', ({pos, radius, shake, sparks, flash}) => {
            BombWeapon.spawnExplosionVisual(this, pos, {radius, sparks});
            if (shake) this.camera.addShake(shake);
            if (flash) this.effects.push(flash);
        });
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
        if (!this.running) return;

        // 镜头跟随
        this.camera.update(this.player.pos, dt);

        // 背景
        this.stars.forEach((s) => s.update(dt));

        // 玩家
        this.player.update(dt);

        // 敌人生成
        this.spawnTimer -= dt;
        const spawnInterval = Math.max(0.25, 1.1 - this.score * 0.01);
        if (this.spawnTimer <= 0) {
            this.mobs.push(new BaseEnemy(new Vec2(rand(24, Game.W - 24), -30)));
            this.spawnTimer = spawnInterval;
        }

        this.mobs.forEach((e) => e.update(dt));
        this.bullets.forEach((b) => b.update(dt));
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
        this.mobs = this.mobs.filter((e) => !e.isDead);
        this.bullets = this.bullets.filter((b) => !b.isDead);
        this.effects = this.effects.filter(e => e.alive);

        // UI
        if (!this.running) return;
        const dev = this.player.invincible ? " - Dev模式(无敌/V切换)" : "";
        const livesText = ` - 剩余机会: ${this.player.getHealth}`;
        this.ui.textContent = `分数: ${this.score}${livesText} - 移动: WASD 或鼠标 - 射击: 空格 - 释放炸弹: 数字1${dev}`;
    }

    public gameOver() {
        this.player.onDeath();
        this.running = false;
        this.ui.textContent = `游戏结束 · 分数 ${this.score} · 按 Enter 重开`;
        this.effects.push(new ScreenFlash(1, 0.25, '#ff0000'));
    }

    public render() {
        const ctx = Game.ctx;
        ctx.clearRect(0, 0, Game.W, Game.H);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.viewOffset.x), -Math.floor(this.camera.viewOffset.y));

        // 背景层
        this.drawBackground(ctx);

        // 实体
        this.stars.forEach((s) => s.render(ctx));
        this.mobs.forEach((e) => e.render(ctx));
        this.bullets.forEach((b) => b.render(ctx));
        if (!this.player.isDead) this.player.render(ctx);

        this.effects.forEach(e => e.render(ctx));
        ctx.restore();

        // 顶部渐隐遮罩
        const g = ctx.createLinearGradient(0, 0, 0, 60);
        g.addColorStop(0, "rgba(5,9,21,0.9)");
        g.addColorStop(1, "rgba(5,9,21,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, Game.W, 60);
    }

    public drawBackground(ctx: CanvasRenderingContext2D) {
        ctx.save();

        // 边界
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = "#e6f0ff";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, Game.H);
        ctx.lineTo(Game.W, Game.H);
        ctx.lineTo(Game.W, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // 网格
        ctx.globalAlpha = 0.06;
        ctx.strokeStyle = "#89b7ff";
        for (let x = 0; x < Game.W; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, Game.H);
            ctx.stroke();
        }
        for (let y = 0; y < Game.H; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(Game.W, y);
            ctx.stroke();
        }
        ctx.restore();
    }
}