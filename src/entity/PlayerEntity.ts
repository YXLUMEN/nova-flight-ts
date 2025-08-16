import {type Input} from "../Input.ts";
import {World} from "../World.ts";
import {type Weapon} from "../weapon/Weapon.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {LivingEntity} from "./LivingEntity.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {clamp} from "../math/math.ts";
import {Cannon40Weapon} from "../weapon/Cannon40Weapon.ts";
import {throttleTimeOut} from "../utils/uit.ts";
import {isBaseWeapon} from "../weapon/IBaseWeapon.ts";
import {isSpecialWeapon} from "../weapon/ISpecialWeapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {ImmutVec2} from "../math/ImmutVec2.ts";
import {EdgeGlowEffect} from "../effect/EdgeGlowEffect.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: Input;
    public readonly weapons = new Map<string, Weapon>();

    public override speed = 300;
    public score: number;
    public invincible = false;
    public devMode = false;

    private readonly baseWeapons: Weapon[] = [];
    private currentBaseIndex: number = 0;

    constructor(input: Input) {
        super(new Vec2(World.W / 2, World.H - 80), 18, 3);

        this.input = input;
        this.score = 0;

        this.baseWeapons.push(new Cannon40Weapon(this));
        this.weapons.set('40', this.baseWeapons[0]);
        this.weapons.set('bomb', new BombWeapon(this));
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        // 键盘移动
        let dx = 0, dy = 0;
        if (this.input.isDown("ArrowLeft", "KeyA")) dx -= 1;
        if (this.input.isDown("ArrowRight", "KeyD")) dx += 1;
        if (this.input.isDown("ArrowUp", "KeyW")) dy -= 1;
        if (this.input.isDown("ArrowDown", "KeyS")) dy += 1;

        // 指针移动
        if (this.input.followMouse) {
            this.pos.x += (this.input.pointer.x - this.pos.x) * Math.min(1, dt * 10);
            this.pos.y += (this.input.pointer.y - this.pos.y) * Math.min(1, dt * 10);
        }

        const len = Math.hypot(dx, dy) || 1;
        this.pos.x += (dx / len) * this.speed * dt;
        this.pos.y += (dy / len) * this.speed * dt;

        // 边界
        this.pos.x = clamp(this.pos.x, 20, World.W - 20);
        this.pos.y = clamp(this.pos.y, 20, World.H - 20);

        if (this.input.isDown('KeyR')) {
            this.switchWeapon();
            return;
        }

        // 射击
        if (this.input.isDown("Space") || this.input.shoot) {
            this.baseWeapons[this.currentBaseIndex].tryFire(world);
        }

        for (const w of this.weapons.values()) {
            if (isSpecialWeapon(w)) {
                if (this.devMode && w.getCooldown() > 0.5) w.setCooldown(0.5);
                if (this.input.wasPressed(w.bindKey())) w.tryFire(world);
            }
            w.update(dt);
        }
    }

    public override onDamage(world: World, damage: number) {
        super.onDamage(world, damage);
        this.invincible = true;
        setTimeout(() => this.invincible = false, 400);

        const center = new ImmutVec2(this.pos.x, this.pos.y);
        BombWeapon.applyBombDamage(world, center, 320, 32);
        world.events.emit('bomb-detonate', {
            pos: center,
            visionRadius: 320,
            shake: 0.4,
            flash: new ScreenFlash(0.2, 0.25, '#ff5151')
        });
        if (this.getHealth() === 1) {
            world.addEffect(new EdgeGlowEffect({
                color: '#ff5151',
                duration: 5.0,
                intensity: 0.5
            }));
        }
    }

    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);
        // 机身
        const grad = ctx.createLinearGradient(0, -20, 0, 20);
        grad.addColorStop(0, "#7ee3ff");
        grad.addColorStop(1, "#2aa9ff");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(14, 8);
        ctx.lineTo(0, 16);
        ctx.lineTo(-14, 8);
        ctx.closePath();
        ctx.fill();

        // 发光
        ctx.strokeStyle = "rgba(140,245,255,.6)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 喷口
        ctx.fillStyle = "rgba(255,200,120,.9)";
        ctx.beginPath();
        ctx.moveTo(-6, 16);
        ctx.lineTo(0, 24 + Math.random() * 6);
        ctx.lineTo(6, 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    public addWeapon(name: string, weapon: Weapon): void {
        if (this.weapons.has(name)) return;

        if (isBaseWeapon(weapon)) this.baseWeapons.push(weapon);
        this.weapons.set(name, weapon);
    }

    public getCurrentWeapon(): Weapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    public switchWeapon = throttleTimeOut(() => {
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }, 200);
}