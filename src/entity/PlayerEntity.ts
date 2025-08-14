import {type Input} from "../Input.ts";
import {World} from "../World.ts";
import {Vec2} from "../math/Vec2.ts";
import {type Weapon} from "../weapon/Weapon.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {LivingEntity} from "./LivingEntity.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {EMPWeapon} from "../weapon/EMPWeapon.ts";
import {clamp} from "../math/math.ts";
import {Cannon40Weapon} from "../weapon/Cannon40Weapon.ts";
import {throttleTimeOut} from "../utils/uit.ts";
import {isBaseWeapon} from "../weapon/IBaseWeapon.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: Input;
    public readonly weapons = new Map<string, Weapon>();
    private readonly baseWeapons: Weapon[] = [];

    public override speed = 300;
    public score: number;

    private currentBaseIndex: number = 0;
    private _invincible = false;

    constructor(input: Input) {
        super(new Vec2(World.W / 2, World.H - 80), 18, 3);
        this.input = input;
        this.score = 0;

        this.baseWeapons.push(new Cannon40Weapon(this));
        this.weapons.set('40', this.baseWeapons[0]);

        this.weapons.set('bomb', new BombWeapon(this));
        this.weapons.set('emp', new EMPWeapon(this));
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        // 键盘移动
        let dx = 0, dy = 0;
        if (this.input.isDown("arrowleft", "a")) dx -= 1;
        if (this.input.isDown("arrowright", "d")) dx += 1;
        if (this.input.isDown("arrowup", "w")) dy -= 1;
        if (this.input.isDown("arrowdown", "s")) dy += 1;

        // 指针移动（可选）
        if (this.input.pointer && this.input.followMouse) {
            this.pos.x += (this.input.pointer.x - this.pos.x) * Math.min(1, dt * 10);
            this.pos.y += (this.input.pointer.y - this.pos.y) * Math.min(1, dt * 10);
        }

        const len = Math.hypot(dx, dy) || 1;
        this.pos.x += (dx / len) * this.speed * dt;
        this.pos.y += (dy / len) * this.speed * dt;

        // 边界
        this.pos.x = clamp(this.pos.x, 20, World.W - 20);
        this.pos.y = clamp(this.pos.y, 20, World.H - 20);

        // 武器冷却
        for (const w of this.weapons.values()) {
            w.update(dt);
        }

        if (this.input.isDown('r')) {
            this.switchWeapon();
            return;
        }
        // 射击
        if (this.input.isDown(" ", "space") || this.input.shoot) {
            this.baseWeapons[this.currentBaseIndex].tryFire(world, !this.invincible);
        }
        if (this.input.isDown('1')) {
            this.weapons.get('bomb')?.tryFire(world, !this.invincible);
        }
        if (this.input.isDown('2')) {
            this.weapons.get('emp')?.tryFire(world, !this.invincible);
        }
    }

    public override onDamage(damage: number) {
        super.onDamage(damage);

        const center = this.pos.clone();
        BombWeapon.applyBombDamage(World.instance, center, 240, 12);
        World.instance.events.emit('bomb-detonate', {
            pos: center,
            radius: 240,
            shake: 0.4,
            flash: new ScreenFlash(0.2, 0.25, '#ff5151')
        });
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
        if (isBaseWeapon(weapon)) this.baseWeapons.push(weapon);
        this.weapons.set(name, weapon);
    }

    public get invincible(): boolean {
        return this._invincible;
    }

    public set invincible(value: boolean) {
        this._invincible = value;
    }

    public getCurrentWeapon(): Weapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    private switchWeapon = throttleTimeOut(() => {
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }, 200);
}