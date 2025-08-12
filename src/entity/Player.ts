import {clamp} from "../math/uit.ts";
import {type Input} from "../Input.ts";
import {Game} from "../Game.ts";
import {Vec2} from "../math/Vec2.ts";
import {type Weapon} from "../weapon/Weapon.ts";
import {BulletGun} from "../weapon/BulletGun.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {LivingEntity} from "./LivingEntity.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";

export class Player extends LivingEntity {
    public readonly input: Input;
    public readonly weapons: Weapon[] = [];
    public speed = 300;

    private _invincible = false;

    constructor(input: Input) {
        super(new Vec2(Game.W / 2, Game.H - 80), 18, 3);
        this.input = input;

        this.weapons.push(new BulletGun(this));
        this.weapons.push(new BombWeapon(this));
    }

    public update(dt: number) {
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
        this.pos.x = clamp(this.pos.x, 20, Game.W - 20);
        this.pos.y = clamp(this.pos.y, 20, Game.H - 20);

        // 射击
        for (const w of this.weapons) {
            w.update(dt);
            w.tryFire();
        }
    }

    public onDamage(damage: number) {
        super.onDamage(damage);

        const center = this.pos.clone();
        BombWeapon.applyBombDamage(Game.instance, center, 240, 12);
        Game.instance.events.emit('bomb-detonate', {
            pos: center,
            radius: 240,
            shake: 0.4,
            flash: new ScreenFlash(0.08, 0.25)
        });
    }

    public render(ctx: CanvasRenderingContext2D) {
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

    get invincible(): boolean {
        return this._invincible;
    }

    set invincible(value: boolean) {
        this._invincible = value;
    }
}