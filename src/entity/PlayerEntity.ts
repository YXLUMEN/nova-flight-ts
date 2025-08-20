import {type Input} from "../Input.ts";
import {World} from "../World.ts";
import {type Weapon} from "../weapon/Weapon.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {LivingEntity} from "./LivingEntity.ts";
import {ScreenFlash} from "../effect/ScreenFlash.ts";
import {clamp} from "../math/math.ts";
import {Cannon40Weapon} from "../weapon/Cannon40Weapon.ts";
import {throttleTimeOut} from "../utils/uit.ts";
import {isSpecialWeapon} from "../weapon/ISpecialWeapon.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {EdgeGlowEffect} from "../effect/EdgeGlowEffect.ts";
import {TechTree} from "../tech_tree/TechTree.ts";
import {BaseWeapon} from "../weapon/BaseWeapon.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";

export class PlayerEntity extends LivingEntity {
    public readonly input: Input;
    public readonly weapons = new Map<string, Weapon>();
    public readonly techTree: TechTree = World.initTechTree();

    public override speed = 300;
    public invincible = false;
    public onDamageExplosionRadius = 320;

    private readonly baseWeapons: Weapon[] = [];
    private currentBaseIndex: number = 0;
    private phaseScore: number;
    private score: number = 0;

    constructor(input: Input) {
        super(new MutVec2(World.W / 2, World.H - 80), 18, 3);

        this.input = input;
        this.phaseScore = 0;

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
        if (WorldConfig.followPointer) {
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
        if (this.input.isDown("Space") || WorldConfig.autoShoot) {
            const w = this.baseWeapons[this.currentBaseIndex];
            if (w.canFire()) w.tryFire(world);
        }

        for (const w of this.weapons.values()) {
            if (isSpecialWeapon(w)) {
                if (WorldConfig.devMode && w.getCooldown() > 0.5) w.setCooldown(0.5);
                if (w.canFire() && this.input.wasPressed(w.bindKey())) w.tryFire(world);
            }
            w.update(dt);
        }
    }

    public override onDamage(world: World, damage: number) {
        world.events.emit('bomb-detonate', {
            pos: this.getPos(),
            damage: 32,
            explosionRadius: this.onDamageExplosionRadius,
            shake: 0.4,
            flash: new ScreenFlash(0.2, 0.25, '#ff5151'),
            important: true
        });

        if (this.techTree.isUnlocked('ele_shield')) {
            const emp = this.weapons.get('emp');
            if (emp && emp.canFire()) {
                emp.tryFire(world);
                return;
            }
        }

        super.onDamage(world, damage);

        if (this.getHealth() === 1) {
            world.addEffect(new EdgeGlowEffect({
                color: '#ff5151',
                duration: 5.0,
                intensity: 0.5
            }));
        }

        if (this.techTree.isUnlocked('electrical_energy_surges')) {
            const emp = this.weapons.get('emp');
            if (emp) {
                const cd = emp.getCooldown();
                emp.tryFire(world);
                emp.setCooldown(cd);
            }
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

        if (weapon instanceof BaseWeapon) this.baseWeapons.push(weapon);
        this.weapons.set(name, weapon);
    }

    public getCurrentWeapon(): Weapon {
        return this.baseWeapons[this.currentBaseIndex];
    }

    public switchWeapon = throttleTimeOut(() => {
        this.currentBaseIndex = (this.currentBaseIndex + 1) % this.baseWeapons.length;
    }, 200);

    public getPhaseScore() {
        return this.phaseScore;
    }

    public getScore() {
        return this.score;
    }

    public setPhaseScore(score: number) {
        this.phaseScore = Math.max(0, score);
    }

    public addPhaseScore(score: number) {
        this.setPhaseScore(this.phaseScore + score);
        this.setScore(this.score + score);
    }

    public setScore(score: number) {
        this.score = Math.max(0, score);
        TechTree.playerScore.textContent = `点数: ${this.score}`;
    }

    public consumeScore(value: number): boolean {
        const remain = this.score - value;
        if (remain < 0) return false;
        this.setScore(remain);
        return true;
    }
}