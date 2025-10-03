import {LaserBeamEffect} from '../../effect/LaserBeamEffect.ts';
import {World} from '../../world/World.ts';
import {clamp, lineCircleHit} from '../../utils/math/math.ts';
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

const id2EffectMap = new Map<number, LaserBeamEffect>();

export class LaserWeapon extends SpecialWeapon {
    public static readonly DISPLAY_NAME = 'LASER';
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';

    private readonly height = World.WORLD_H * 2;        // 长度
    private readonly width = 6;            // 宽度

    public override tryFire(stack: ItemStack, world: World, _attacker: Entity): void {
        this.setActive(stack, this.getActive(stack) ? false : stack.isAvailable());

        if (this.getActive(stack)) this.onStartFire(world);
        if (!this.getActive(stack) && stack.isAvailable()) this.onEndFire(world);
    }

    public override canFire(stack: ItemStack): boolean {
        return stack.isAvailable();
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity): void {
        const lastHeat = this.getHeat(stack);
        if (lastHeat === 0 && !this.getActive(stack)) return;

        // 升温/降温
        const maxHeat = this.getMaxHeat(stack);
        if (this.getActive(stack)) {
            this.setHeat(stack, Math.min(maxHeat, lastHeat + this.getDrainRate(stack)));
        } else {
            this.setHeat(stack, Math.max(0, lastHeat - this.getCoolRate(stack)));
        }

        const heat = this.getHeat(stack);
        const heatLeft = maxHeat - heat;
        if (heatLeft > 120) stack.set(DataComponentTypes.ANY_BOOLEAN, true);

        // 触发过热: 立即停火并锁定
        if (stack.isAvailable()) {
            if (heat >= maxHeat - 1e-6) {
                this.setHeat(stack, maxHeat);
                stack.setAvailable(false);
                this.setActive(stack, false);
                const beamFx = id2EffectMap.get(holder.getId());
                if (beamFx) {
                    beamFx.kill();
                    id2EffectMap.delete(holder.getId());
                }
                this.onEndFire(holder.getWorld());
            }
            if (stack.getOrDefault(DataComponentTypes.ANY_BOOLEAN, false) && heatLeft <= 100) {
                world.playSound(SoundEvents.LASER_OVERHEAT);
                stack.set(DataComponentTypes.ANY_BOOLEAN, false);
            }
        }

        // 过热解锁: 必须完全冷却到 0
        if (!stack.isAvailable() && this.getHeat(stack) <= 0) {
            this.setHeat(stack, 0);
            stack.setAvailable(true);
            world.playSound(SoundEvents.WEAPON_READY);
        }

        if (!this.getActive(stack)) {
            const beamFx = id2EffectMap.get(holder.getId());
            if (beamFx) {
                beamFx.kill();
                id2EffectMap.delete(holder.getId());
            }
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

        for (const mob of world.getMobs()) {
            if (mob.isRemoved() ||
                !lineCircleHit(
                    start.x, start.y, end.x, end.y,
                    mob.getPositionRef.x, mob.getPositionRef.y, mob.getWidth())) continue;

            const damage = Math.max(1, Math.round(stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1) | 0));
            mob.takeDamage(world.getDamageSources().laser(holder), damage);
        }

        // 刷新/创建光束效果
        const beamFx = id2EffectMap.get(holder.getId());
        if (beamFx !== undefined && beamFx.alive) {
            beamFx.set(start, end);
        } else {
            const newBeamFx = new LaserBeamEffect(stack.getOrDefault(DataComponentTypes.UI_COLOR, LaserWeapon.COLOR), this.width);
            world.addEffect(newBeamFx);
            id2EffectMap.set(holder.getId(), newBeamFx);
        }
    }

    public override onStartFire(world: World) {
        world.playSound(SoundEvents.LASER_TRIGGER);
        world.playLoopSound(SoundEvents.LASER_BEAM);
    }

    public override onEndFire(world: World) {
        if (world.stopLoopSound(SoundEvents.LASER_BEAM)) {
            world.playSound(SoundEvents.LASER_CHARGE_DOWN);
        }
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
        return stack.isAvailable() ? LaserWeapon.COLOR : LaserWeapon.OVERHEAT_COLOR;
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
        stack.set(DataComponentTypes.MAX_HEAT, Math.floor(maxHeat));
    }

    public getHeat(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.HEAT, 0);
    }

    public setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.HEAT, value);
    }

    public getDrainRate(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.DRAIN_RATE, 2);
    }

    public setDrainRate(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.DRAIN_RATE, value);
    }

    public getCoolRate(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.COOLDOWN_RATE, 1);
    }

    public setCoolRate(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.COOLDOWN_RATE, value);
    }
}
