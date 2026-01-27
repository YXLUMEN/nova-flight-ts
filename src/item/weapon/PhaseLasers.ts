import {LaserBeamEffect} from '../../effect/LaserBeamEffect.ts';
import {World} from '../../world/World.ts';
import {clamp, lineCircleHit, thickLineCircleHit} from '../../utils/math/math.ts';
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {
    LaserWeaponActivate,
    LaserWeaponChange,
    LaserWeaponDeactivate
} from "../../network/packet/s2c/LaserWeaponS2CPacket.ts";
import {encodeColorHex} from "../../utils/NetUtil.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import type {IVec} from "../../utils/math/IVec.ts";


export class PhaseLasers extends SpecialWeapon {
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';

    public static readonly LASER_HEIGHT = World.WORLD_H * 2;

    public static readonly id2EffectMap = new Map<number, LaserBeamEffect>();
    private static readonly activateBeam = new Set<number>();

    protected width = 6;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        this.setActive(stack, this.getActive(stack) ? false : stack.isAvailable());

        if (this.getActive(stack)) this.onStartFire(stack, world, attacker);
        if (!this.getActive(stack) && stack.isAvailable()) this.onEndFire(stack, world, attacker);
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
        if (heatLeft > 60) stack.set(DataComponentTypes.ANY_BOOLEAN, true);

        // 触发过热: 立即停火并锁定
        if (stack.isAvailable()) {
            if (heat >= maxHeat - 1e-6) {
                this.setHeat(stack, maxHeat);
                stack.setAvailable(false);
                this.setActive(stack, false);
                this.removeLaser(world, holder.getId());
                this.onEndFire(stack, world, holder);
            }
            if (stack.getOrDefault(DataComponentTypes.ANY_BOOLEAN, false) && heatLeft <= 40) {
                this.overHeatAlert(world, holder);
                stack.set(DataComponentTypes.ANY_BOOLEAN, false);
            }
        }

        // 过热解锁: 必须完全冷却到 0
        if (!stack.isAvailable() && this.getHeat(stack) <= 0) {
            this.setHeat(stack, 0);
            stack.setAvailable(true);
            world.playSound(holder, SoundEvents.WEAPON_READY);
        }

        if (!this.getActive(stack)) {
            this.removeLaser(world, holder.getId());
            return;
        }

        // 光束端点
        const entityId = holder.getId();
        const start = holder.getPositionRef;
        const yaw = holder.getYaw();
        const end = new Vec2(
            start.x + Math.cos(yaw) * PhaseLasers.LASER_HEIGHT,
            start.y + Math.sin(yaw) * PhaseLasers.LASER_HEIGHT
        );

        if (world.isClient) {
            // 刷新/创建光束效果
            const beamFx = PhaseLasers.id2EffectMap.get(entityId);
            if (beamFx && beamFx.isAlive()) {
                beamFx.set(start, end);
            } else {
                const newBeamFx = new LaserBeamEffect(stack.getOrDefault(DataComponentTypes.UI_COLOR, PhaseLasers.COLOR), this.width);
                newBeamFx.reset(start, end);
                world.addEffect(null, newBeamFx);
                PhaseLasers.id2EffectMap.set(entityId, newBeamFx);
            }
            return;
        }

        if (PhaseLasers.activateBeam.has(entityId)) {
            world.sendPacket(new LaserWeaponChange(entityId, start, end));
        } else {
            world.sendPacket(new LaserWeaponActivate(
                entityId,
                start,
                end,
                this.width,
                encodeColorHex(stack.getOrDefault(DataComponentTypes.UI_COLOR, PhaseLasers.COLOR))
            ));
        }

        this.damage(world as ServerWorld, stack, holder, start, end);
    }

    private removeLaser(world: World, entityId: number) {
        const beamFx = PhaseLasers.id2EffectMap.get(entityId);
        if (beamFx) {
            beamFx.kill();
            PhaseLasers.id2EffectMap.delete(entityId);
        }
        PhaseLasers.activateBeam.delete(entityId);
        if (!world.isClient) world.sendPacket(new LaserWeaponDeactivate(entityId));
    }

    protected damage(world: ServerWorld, stack: ItemStack, holder: Entity, start: IVec, end: IVec) {
        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
        const damageSource = world.getDamageSources().laser(holder).setShieldMulti(0.1);

        for (const mob of world.getMobs()) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                this.width,
                pos.x, pos.y, mob.getWidth())) {
                mob.takeDamage(damageSource, damage);
            }
        }

        for (const project of (world as ServerWorld).getProjectiles()) {
            if (project.getOwner() === holder || !(project instanceof MissileEntity)) continue;
            const pos = project.getPositionRef;
            if (lineCircleHit(start.x, start.y, end.x, end.y, pos.x, pos.y, project.getWidth())) {
                project.explode();
                project.discard();
            }
        }
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playSound(attacker, SoundEvents.LASER_TRIGGER);
        world.playLoopSound(attacker, SoundEvents.LASER_BEAM_LOW, 0.5);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.stopLoopSound(attacker, SoundEvents.LASER_BEAM_LOW);
        world.playSound(attacker, SoundEvents.LASER_CHARGE_DOWN);
    }

    protected overHeatAlert(world: World, holder: Entity) {
        world.playSound(holder, SoundEvents.LASER_OVERHEAT);
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

    public override getDisplayName(): string {
        return '相位镭射';
    }

    public override getUiColor(stack: ItemStack): string {
        return stack.isAvailable() ? PhaseLasers.COLOR : PhaseLasers.OVERHEAT_COLOR;
    }

    public setActive(stack: ItemStack, active: boolean): void {
        stack.set(DataComponentTypes.FIRING, active);
    }

    public getActive(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.FIRING, false);
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

    public override getSortIndex(): number {
        return 2;
    }
}
