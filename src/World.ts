import {Input} from "./Input.ts";
import {PlayerEntity} from "./entity/PlayerEntity.ts";
import {Camera} from "./Camera.ts";
import {MobEntity} from "./entity/MobEntity.ts";
import {EventBus} from "./event/EventBus.ts";
import type {Effect} from "./effect/Effect.ts";
import {BombWeapon} from "./weapon/BombWeapon.ts";
import {ScreenFlash} from "./effect/ScreenFlash.ts";
import {StarField} from "./effect/StarField.ts";
import {layers} from "./configs/StarfieldConfig.ts";
import {UI} from "./ui/UI.ts";
import {STAGE} from "./configs/StageConfig.ts";
import {DPR, isMobile} from "./utils/uit.ts";
import {collideCircle} from "./math/math.ts";
import type {ProjectileEntity} from "./entity/ProjectileEntity.ts";
import {EdgeGlowEffect} from "./effect/EdgeGlowEffect.ts";
import {M_STAGE} from "./configs/MobileConfig.ts";

export class World {
    public static instance: World;
    public static canvas = document.getElementById("game") as HTMLCanvasElement;
    public static ctx = World.canvas.getContext("2d")!;
    public static W = 800;
    public static H = 600;

    public readonly ui: UI = new UI(this);
    public readonly camera: Camera = new Camera();
    public readonly events: EventBus = new EventBus();

    private last = 0;
    private accumulator = 0;
    private readonly fixedDt = 0.02;
    private readonly stage = isMobile() ? M_STAGE : STAGE;

    private input = new Input(World.canvas);
    public player = new PlayerEntity(this.input);

    private effects: Effect[] = [];
    public mobs: MobEntity[] = [];
    public bullets: ProjectileEntity[] = [];

    private starField: StarField = new StarField(128, layers, 8);

    public over = false;
    public ticking = true;
    private rendering = true;

    constructor() {
        if (World.instance) return World.instance;

        this.resize();
        this.registryListeners();
        this.registryEvents();

        this.starField.init(this.camera);

        this.loop(0);
    }

    public reset() {
        this.mobs = [];
        this.bullets = [];
        this.effects = [];
        this.player = new PlayerEntity(this.input);

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

    public resize() {
        const rect = World.canvas.getBoundingClientRect();

        World.canvas.width = Math.floor(rect.width * DPR);
        World.canvas.height = Math.floor(rect.height * DPR);

        World.W = Math.floor(rect.width);
        World.H = Math.floor(rect.height);

        World.ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    public loop(ts: number) {
        const dt = Math.min(0.05, (ts - this.last) / 1000 || 0);
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

        this.camera.update(this.player.pos, dt);
        this.starField.update(dt, this.camera);

        if (!this.over) this.player.update(this, dt);

        this.stage.update(this, dt);

        this.mobs.forEach(mob => mob.update(this, dt));
        this.bullets.forEach(b => b.update(this, dt));
        this.effects.forEach(e => e.update(dt));

        // 碰撞: 子弹
        for (const bullet of this.bullets) {
            if (bullet.isDead) continue;

            if (bullet.owner instanceof MobEntity) {
                if (this.player.invincible || !collideCircle(this.player, bullet)) continue;

                this.player.onDamage(this, 1);
                bullet.onHit(this);
                if (this.player.isDead) {
                    this.gameOver();
                    break;
                }
            } else if (bullet.owner instanceof PlayerEntity) {
                for (const mob of this.mobs) {
                    if (mob.isDead || !collideCircle(bullet, mob)) continue;

                    mob.onDamage(this, bullet.damage);
                    bullet.onHit(this);
                    if (mob.isDead) this.events.emit('mob-killed', mob);
                    break;
                }
            }
        }

        // 碰撞: 玩家
        for (const mob of this.mobs) {
            if (mob.isDead || !collideCircle(this.player, mob)) continue;
            if (this.player.invincible) break;

            mob.onDeath(this);
            this.player.onDamage(this, 1);
            if (this.player.isDead) {
                this.gameOver();
                break;
            }
        }

        // 清理
        this.mobs = this.mobs.filter(e => !e.isDead);
        this.bullets = this.bullets.filter(b => !b.isDead);
        this.effects = this.effects.filter(e => e.alive);

        this.input.updateEndFrame();
    }

    public gameOver() {
        this.over = true;
        this.effects.push(new ScreenFlash(1, 0.25, '#ff0000'));
        setTimeout(() => {
            this.ticking = false;
        }, 1000);
    }

    public addEffect(effect: Effect) {
        this.effects.push(effect);
    }

    public render() {
        if (!this.rendering) return;

        const ctx = World.ctx;
        ctx.clearRect(0, 0, World.W, World.H);

        this.starField.render(ctx, this.camera);

        ctx.save();
        ctx.translate(-Math.floor(this.camera.viewOffset.x), -Math.floor(this.camera.viewOffset.y));

        // 背景层
        this.drawBackground(ctx);

        // 实体
        this.mobs.forEach((e) => e.render(ctx));
        this.bullets.forEach((b) => b.render(ctx));
        this.effects.forEach(e => e.render(ctx));

        if (!this.player.isDead) this.player.render(ctx);

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

    private registryEvents() {
        this.events.clear();

        this.events.on('mob-killed', (event: MobEntity) => {
            this.player.score += event.getWorth();
        });

        this.events.on('bomb-detonate', (event) => {
            const {pos, shake, flash} = event;
            BombWeapon.spawnExplosionVisual(this, pos, event);
            if (shake) this.camera.addShake(shake);
            if (flash) this.effects.push(flash);
        });

        this.events.on('emp-detonate', () => {
            this.effects.push(new ScreenFlash(0.5, 0.18, '#5ec8ff'));
        });

        this.events.on('stage-enter', ({name}) => {
            if (name === 'P1') return;

            this.effects.push(new EdgeGlowEffect({
                color: '#00b973',
                duration: 0.8,
                thickness: 16
            }));

            if (name === 'P2') import('./weapon/EMPWeapon.ts').then(mod => {
                this.player.addWeapon('emp', new mod.EMPWeapon(this.player));
            });
            else if (name === 'P3') import('./weapon/MiniGunWeapon.ts').then(mod => {
                this.player.addWeapon('mini', new mod.MiniGunWeapon(this.player));
            });
            else if (name === 'P4') import('./weapon/LaserWeapon.ts').then(mod => {
                this.player.addWeapon('laser', new mod.LaserWeapon(this.player));
            });
            else if (name === 'P5') import('./weapon/Cannon90Weapon.ts').then(mod => {
                this.player.addWeapon('90', new mod.Cannon90Weapon(this.player));
                return import('./weapon/IntoVoidWeapon.ts');
            }).then(mod => {
                this.player.addWeapon('void', new mod.IntoVoidWeapon(this.player));
            });
        });
    }

    private registryListeners() {
        window.addEventListener("resize", () => this.resize());

        window.addEventListener("keydown", e => {
            const code = e.code;

            if (code === "Enter" && this.over) this.reset();
            else if (code === "KeyP" || code === 'Escape') this.togglePause();

            // Dev mode
            if (e.ctrlKey && code === "KeyV") this.player.devMode = this.player.invincible = !this.player.devMode;
            if (this.player.devMode) this.devMode(code);
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
                this.player.score += 10;
                break;
            case 'KeyO':
                import('./weapon/MiniGunWeapon.ts').then(mod => {
                    this.player.addWeapon('mini', new mod.MiniGunWeapon(this.player));
                    return import('./weapon/Cannon90Weapon.ts');
                }).then(mod => {
                    this.player.addWeapon('90', new mod.Cannon90Weapon(this.player));
                    return import('./weapon/EMPWeapon.ts')
                }).then(mod => {
                    this.player.addWeapon('emp', new mod.EMPWeapon(this.player));
                    return import('./weapon/LaserWeapon.ts');
                }).then(mod => {
                    this.player.addWeapon('laser', new mod.LaserWeapon(this.player));
                    return import('./weapon/IntoVoidWeapon.ts');
                }).then(mod => {
                    this.player.addWeapon('void', new mod.IntoVoidWeapon(this.player));
                });
                break;
            case 'KeyC':
                this.mobs = [];
                break;
            case 'KeyH':
                this.player.setHealth(this.player.getMaxHealth());
        }
    }
}