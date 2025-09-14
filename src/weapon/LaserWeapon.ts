import {LaserBeamEffect} from '../effect/LaserBeamEffect.ts';
import {World} from '../world/World.ts';
import {clamp, lineCircleHit} from '../utils/math/math.ts';
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";

export class LaserWeapon extends SpecialWeapon {
    public static readonly DISPLAY_NAME = 'LASER';
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';
    public laserColor = LaserWeapon.COLOR;

    public maxHeat = 400;        // 满热前可持续tick数
    public drainRate = 2;     // 开火每tick升温
    public coolRate = 1;      // 松开每tick降温
    // 过热参数
    private heat = 0;
    private active = false;
    private overheated = false;
    private playSound = true;

    private readonly height = World.H;        // 长度
    private readonly width = 6;            // 宽度

    // 缓存一个短寿命的光束效果
    private beamFx: LaserBeamEffect | null = null;

    public constructor(owner: LivingEntity) {
        super(owner, 1, 4);
    }

    public override tryFire(world: World): void {
        this.active = this.active ? false : !this.overheated;
        if (this.active) this.onStartFire(world);
        if (!this.active && !this.overheated) this.onEndFire(world);
    }

    public override canFire(): boolean {
        return true;
    }

    public override tick(): void {
        if (this.heat === 0 && !this.active) return;

        // 升温/降温
        if (this.active) {
            this.heat = Math.min(this.maxHeat, this.heat + this.drainRate);
        } else {
            this.heat = Math.max(0, this.heat - this.coolRate);
        }
        const heatLeft = this.maxHeat - this.heat;
        if (heatLeft > 120) this.playSound = true;

        // 触发过热: 立即停火并锁定
        if (!this.overheated) {
            if (this.heat >= this.maxHeat - 1e-6) {
                this.heat = this.maxHeat;
                this.overheated = true;
                this.active = false;
                if (this.beamFx) this.beamFx.kill();
                this.beamFx = null;
                this.onEndFire(this.owner.getWorld());
            }
            if (this.playSound && heatLeft <= 100) {
                SoundSystem.playSound(SoundEvents.LASER_OVERHEAT);
                this.playSound = false;
            }
        }

        // 过热解锁: 必须完全冷却到 0
        if (this.overheated && this.heat <= 0) {
            this.heat = 0;
            this.overheated = false;
            SoundSystem.playSound(SoundEvents.WEAPON_READY);
        }

        if (!this.active) {
            // 停火时移除效果
            if (this.beamFx) this.beamFx.kill();
            this.beamFx = null;
            return;
        }

        // 光束端点
        const world = this.owner.getWorld();

        const start = this.owner.getPositionRef;
        const yaw = this.owner.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);
        const end = new MutVec2(
            start.x + f * this.height,
            start.y + g * this.height
        );

        const attacker = this.owner instanceof PlayerEntity ? this.owner : null;

        for (const mob of world.getLoadMobs()) {
            if (mob.isRemoved() ||
                !lineCircleHit(
                    start.x, start.y, end.x, end.y,
                    mob.getPositionRef.x, mob.getPositionRef.y, mob.getEntityDimension().width)) continue;

            const damage = Math.max(1, Math.round(this.damage | 0));
            mob.takeDamage(world.getDamageSources().laser(attacker), damage);
        }

        // 刷新/创建光束效果
        if (!this.beamFx || !this.beamFx.alive) {
            this.beamFx = new LaserBeamEffect(this.laserColor, this.width);
            world.addEffect(this.beamFx);
        }
        this.beamFx.set(start, end);
    }

    public override onStartFire(_world: World) {
        SoundSystem.playSound(SoundEvents.LASER_TRIGGER);
        SoundSystem.playLoopSound(SoundEvents.LASER_BEAM);
    }

    public override onEndFire(_world: World) {
        if (SoundSystem.stopLoopSound(SoundEvents.LASER_BEAM)) {
            SoundSystem.playSound(SoundEvents.LASER_CHARGE_DOWN);
        }
    }

    public instantCooldown() {
        this.heat = 0;
        this.overheated = false;
    }

    public override isReady(): boolean {
        return false;
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

    public isOverHeat(): boolean {
        return this.overheated;
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
