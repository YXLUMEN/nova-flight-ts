import {LaserBeamEffect} from '../../effect/LaserBeamEffect.ts';
import {World} from '../../world/World.ts';
import {clamp, lineCircleHit} from '../../utils/math/math.ts';
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

export class LaserWeapon extends SpecialWeapon {
    public static readonly DISPLAY_NAME = 'LASER';
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';

    public laserColor = LaserWeapon.COLOR;

    private playSound = true;

    private readonly height = World.H;        // 长度
    private readonly width = 6;            // 宽度

    // 缓存一个短寿命的光束效果
    private beamFx: LaserBeamEffect | null = null;

    public override tryFire(stack: ItemStack, world: World, _attacker: Entity): void {
        this.setActive(stack, this.getActive(stack) ? false : !this.getOverheated(stack));

        if (this.getActive(stack)) this.onStartFire(world);
        if (!this.getActive(stack) && !this.getOverheated(stack)) this.onEndFire(world);
    }

    public override canFire(): boolean {
        return true;
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity): void {
        const lastHeat = this.getHeat(stack);
        if (lastHeat === 0 && !this.getActive(stack)) return;

        // 升温/降温
        if (this.getActive(stack)) {
            this.setHeat(stack, Math.min(this.getHeat(stack), lastHeat + this.getDrainRate(stack)));
        } else {
            this.setHeat(stack, Math.max(0, lastHeat - this.getCoolRate(stack)));
        }

        const heat = this.getHeat(stack);
        const maxHeat = this.getMaxHeat(stack);
        const heatLeft = maxHeat - heat;
        if (heatLeft > 120) this.playSound = true;

        // 触发过热: 立即停火并锁定
        if (!this.getOverheated(stack)) {
            if (heat >= maxHeat - 1e-6) {
                this.setHeat(stack, maxHeat);
                this.setOverheat(stack, true);
                this.setActive(stack, false);
                if (this.beamFx) this.beamFx.kill();
                this.beamFx = null;
                this.onEndFire(holder.getWorld());
            }
            if (this.playSound && heatLeft <= 100) {
                SoundSystem.playSound(SoundEvents.LASER_OVERHEAT);
                this.playSound = false;
            }
        }

        // 过热解锁: 必须完全冷却到 0
        if (this.getOverheated(stack) && this.getHeat(stack) <= 0) {
            this.setHeat(stack, 0);
            this.setOverheat(stack, false);
            SoundSystem.playSound(SoundEvents.WEAPON_READY);
        }

        if (!this.getActive(stack)) {
            // 停火时移除效果
            if (this.beamFx) this.beamFx.kill();
            this.beamFx = null;
            return;
        }

        // 光束端点
        const start = holder.getPositionRef;
        const yaw = holder.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);
        const end = new MutVec2(
            start.x + f * this.height,
            start.y + g * this.height
        );

        for (const mob of world.getLoadMobs()) {
            if (mob.isRemoved() ||
                !lineCircleHit(
                    start.x, start.y, end.x, end.y,
                    mob.getPositionRef.x, mob.getPositionRef.y, mob.getEntityDimension().width)) continue;

            const damage = Math.max(1, Math.round(stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1) | 0));
            mob.takeDamage(world.getDamageSources().laser(holder), damage);
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

    public instantCooldown(stack: ItemStack) {
        this.setOverheat(stack, false);
    }

    public override isReady(): boolean {
        return false;
    }

    public override setCooldown(stack: ItemStack, value: number) {
        this.setHeat(stack, clamp(value, 0, this.getMaxHeat(stack)));
    }

    public override getCooldown(stack: ItemStack): number {
        return this.getHeat(stack);
    }

    public override getMaxCooldown(stack: ItemStack): number {
        return this.getMaxHeat(stack);
    }

    public bindKey(): string {
        return 'Digit3';
    }

    public override getDisplayName(): string {
        return LaserWeapon.DISPLAY_NAME;
    }

    public override getUiColor(stack: ItemStack): string {
        return this.getOverheated(stack) ? LaserWeapon.OVERHEAT_COLOR : LaserWeapon.COLOR;
    }

    public setActive(stack: ItemStack, active: boolean): void {
        stack.set(DataComponentTypes.ACTIVE, active);
    }

    public getActive(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.ACTIVE, false);
    }

    public getMaxHeat(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.MAX_HEAT, 0);
    }

    public setMaxHeat(stack: ItemStack, maxHeat: number): void {
        stack.set(DataComponentTypes.MAX_HEAT, maxHeat);
    }

    public getHeat(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.HEAT, 0);
    }

    public setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.HEAT, value);
    }

    public getDrainRate(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.DRAIN_RATE, 0);
    }

    public setDrainRate(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.DRAIN_RATE, value);
    }

    public getCoolRate(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.COOLDOWN_RATE, 0);
    }

    public setCoolRate(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.COOLDOWN_RATE, value);
    }

    public setOverheat(stack: ItemStack, override: boolean): void {
        stack.set(DataComponentTypes.OVERHEAT, override);
    }

    public getOverheated(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.OVERHEAT, false);
    }
}
