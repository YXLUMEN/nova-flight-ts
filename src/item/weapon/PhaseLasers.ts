import {World} from '../../world/World.ts';
import {clamp, thickLineCircleHit} from '../../utils/math/math.ts';
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {LaserWeaponActivate, LaserWeaponDeactivate} from "../../network/packet/s2c/LaserWeaponS2CPacket.ts";
import {LaserBeamManger} from "../../world/LaserBeamManger.ts";


export class PhaseLasers extends SpecialWeapon {
    public static readonly COLOR = '#8bff5e';
    public static readonly OVERHEAT_COLOR = '#ff5e5e';
    public static readonly LASER_HEIGHT = World.MAP_HEIGHT * 2;
    public static readonly manager = new LaserBeamManger();

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
        if (heatLeft > 60) stack.set(DataComponents.ANY_BOOLEAN, true);

        // 触发过热: 立即停火并锁定
        if (stack.isAvailable()) {
            if (heat >= maxHeat - 1e-6) {
                this.setHeat(stack, maxHeat);
                stack.setAvailable(false);
                this.setActive(stack, false);
                this.removeLaser(world, stack);
                this.onEndFire(stack, world, holder);
            }
            if (stack.getOr(DataComponents.ANY_BOOLEAN, false) && heatLeft <= 40) {
                this.overHeatAlert(world, holder);
                stack.set(DataComponents.ANY_BOOLEAN, false);
            }
        }

        // 过热解锁: 必须完全冷却到 0
        if (!stack.isAvailable() && this.getHeat(stack) <= 0) {
            this.setHeat(stack, 0);
            stack.setAvailable(true);
            world.playSound(holder, SoundEvents.WEAPON_READY);
        }

        if (!this.getActive(stack)) {
            this.removeLaser(world, stack);
            return;
        }

        // 光束端点
        let laserId = stack.getOr(DataComponents.LASER_ID, -1);
        if (laserId < 0) {
            laserId = PhaseLasers.manager.allocate();
            stack.set(DataComponents.LASER_ID, laserId);
        }

        const start = holder.positionRef;
        const yaw = holder.getYaw();
        const end = new Vec2(
            start.x + Math.cos(yaw) * PhaseLasers.LASER_HEIGHT,
            start.y + Math.sin(yaw) * PhaseLasers.LASER_HEIGHT
        );

        if (world.isClient) {
            const beamFx = PhaseLasers.manager.get(laserId);
            if (beamFx && beamFx.isAlive()) beamFx.setByVec(start, end);
            return;
        }

        if (!PhaseLasers.manager.isActivated(laserId)) {
            world.sendPacket(new LaserWeaponActivate(
                laserId,
                start,
                end,
                this.width,
                stack.getOr(DataComponents.UI_COLOR, PhaseLasers.COLOR)
            ));
            PhaseLasers.manager.markActivated(laserId);
        }

        this.damage(world as ServerWorld, stack, holder, start, end);
    }

    private removeLaser(world: World, stack: ItemStack): void {
        const laserId = stack.getOr(DataComponents.LASER_ID, -1);
        if (laserId < 0) return;

        PhaseLasers.manager.release(laserId);
        stack.remove(DataComponents.LASER_ID);
        if (!world.isClient) {
            world.sendPacket(new LaserWeaponDeactivate(laserId));
        }
    }

    protected damage(world: ServerWorld, stack: ItemStack, holder: Entity, start: Vec2, end: Vec2) {
        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 1);
        const damageSource = world.getDamageSources()
            .laser(holder)
            .setHealthMulti(1.2)
            .setShieldMulti(0.1);

        for (const mob of world.getMobs()) {
            const pos = mob.positionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                this.width,
                pos.x, pos.y,
                mob.getWidth() / 2)) {
                mob.takeDamage(damageSource, damage);
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
        if (world.stopLoopSound(attacker, SoundEvents.LASER_BEAM_LOW)) {
            world.playSound(attacker, SoundEvents.LASER_CHARGE_DOWN);
        }
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
        stack.set(DataComponents.FIRING, active);
    }

    public getActive(stack: ItemStack): boolean {
        return stack.getOr(DataComponents.FIRING, false);
    }

    public getMaxHeat(stack: ItemStack): number {
        return stack.getOr(DataComponents.MAX_HEAT, 0);
    }

    public setMaxHeat(stack: ItemStack, maxHeat: number): void {
        stack.set(DataComponents.MAX_HEAT, Math.floor(maxHeat));
    }

    public getHeat(stack: ItemStack): number {
        return stack.getOr(DataComponents.HEAT, 0);
    }

    public setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponents.HEAT, value);
    }

    public getDrainRate(stack: ItemStack): number {
        return stack.getOr(DataComponents.DRAIN_RATE, 2);
    }

    public setDrainRate(stack: ItemStack, value: number) {
        stack.set(DataComponents.DRAIN_RATE, value);
    }

    public getCoolRate(stack: ItemStack): number {
        return stack.getOr(DataComponents.COOLDOWN_RATE, 1);
    }

    public setCoolRate(stack: ItemStack, value: number) {
        stack.set(DataComponents.COOLDOWN_RATE, value);
    }
}
