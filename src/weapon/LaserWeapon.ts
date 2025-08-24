import {LaserBeamEffect} from '../effect/LaserBeamEffect.ts';
import {Weapon} from './Weapon.ts';
import {World} from '../World.ts';
import {MutVec2} from '../math/MutVec2.ts';
import {clamp, lineCircleHit} from '../math/math.ts';
import type {Entity} from "../entity/Entity.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";

export class LaserWeapon extends Weapon implements ISpecialWeapon {
    public static readonly DISPLAY_NAME = 'LASER';
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';

    // 过热参数
    private heat = 0;
    public maxHeat = 8.0;        // 满热前可持续秒数
    private readonly drainRate = 1.2;     // 开火每秒升温
    public coolRate = 0.6;      // 松开每秒降温

    private active = false;
    private overheated = false;

    private readonly range = World.H;        // 光束长度
    private readonly width = 6;            // 视觉宽度

    // 缓存一个短寿命的光束效果
    private beamFx: LaserBeamEffect | null = null;

    constructor(owner: Entity) {
        super(owner, 1, 4);
    }

    public override tryFire(_world: World): void {
        this.active = this.active ? false : !this.overheated;
    }

    public override canFire(): boolean {
        return true;
    }

    public override update(dt: number): void {
        if (this.heat === 0 && !this.active) return;

        // 升温/降温
        if (this.active) {
            this.heat = Math.min(this.maxHeat, this.heat + this.drainRate * dt);
        } else {
            this.heat = Math.max(0, this.heat - this.coolRate * dt);
        }

        // 触发过热: 立即停火并锁定
        if (!this.overheated && this.heat >= this.maxHeat - 1e-6) {
            this.heat = this.maxHeat;
            this.overheated = true;
            this.active = false;
            if (this.beamFx) this.beamFx.kill();
            this.beamFx = null;
        }

        // 过热解锁: 必须完全冷却到 0
        if (this.overheated && this.heat <= 0) {
            this.heat = 0;
            this.overheated = false;
        }

        if (!this.active) {
            // 停火时移除效果
            if (this.beamFx) this.beamFx.kill();
            this.beamFx = null;
            return;
        }

        // 光束端点
        const world = World.instance;
        const start = this.owner.pos;
        const end = new MutVec2(start.x, start.y - this.range);
        const attacker = this.owner instanceof PlayerEntity ? this.owner : null;

        for (const mob of world.mobs) {
            if (mob.isDead()) continue;
            if (!lineCircleHit(start.x, start.y, end.x, end.y, mob.pos.x, mob.pos.y, mob.boxRadius ?? 16)) continue;

            const damage = Math.max(1, Math.round(this.damage | 0));
            mob.takeDamage(world.getDamageSources().laser(attacker), damage);
        }

        // 刷新/创建光束效果
        if (!this.beamFx || !this.beamFx.alive) {
            this.beamFx = new LaserBeamEffect(LaserWeapon.COLOR, this.width);
            world.addEffect(this.beamFx);
        }
        this.beamFx.set(start, end);
    }

    public instantCooldown() {
        this.heat = 0;
        this.overheated = false;
    }

    public override setCooldown(value: number) {
        this.heat = clamp(value, 0, this.maxHeat);
    }

    public override getCooldown(): number {
        return this.heat;
    }

    public override getMaxCooldown(): number {
        return this.maxHeat;
    }

    public bindKey(): string {
        return 'Digit3';
    }

    public override getDisplayName(): string {
        return LaserWeapon.DISPLAY_NAME;
    }

    public override getUiColor(): string {
        return this.overheated ? LaserWeapon.OVERHEAT_COLOR : LaserWeapon.COLOR;
    }
}
