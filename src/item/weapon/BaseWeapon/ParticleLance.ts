import {type Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../../world/World.ts";
import {PhaseLasers} from "../PhaseLasers.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {thickLineCircleHit} from "../../../utils/math/math.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";
import {ClientEffect} from "../../../utils/ClientEffect.ts";
import {spawnLaser} from "../../../utils/ServerEffect.ts";

export class ParticleLance extends BaseWeapon {
    public static readonly LASER_WIDTH = 8;
    public static readonly CHARGING_TIME = 10;

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, _slot: number, selected: boolean): void {
        if (stack.get(DataComponents.SCHEDULE_FIRE)) {
            if (!selected) {
                stack.remove(DataComponents.SCHEDULE_FIRE);
                stack.remove(DataComponents.CHARGING_PROGRESS);
                return;
            }

            const charging = stack.getOrDefault(DataComponents.CHARGING_PROGRESS, 0) - 1;
            if (charging <= 0) {
                if (!world.isClient) this.onFire(stack, world as ServerWorld, holder);

                this.setCooldown(stack, this.getFireRate(stack));

                stack.set(DataComponents.SCHEDULE_FIRE, false);
            } else if (world.isClient) {
                ClientEffect.spawnChargingParticles(world as ClientWorld, holder, 4, this.getUiColor());
            }

            stack.set(DataComponents.CHARGING_PROGRESS, Math.max(charging, 0));
            return;
        }

        const cooldown = stack.getOrDefault(DataComponents.COOLDOWN, 0);
        if (cooldown > 0 && this.shouldCooldown(stack)) {
            this.setCooldown(stack, cooldown - 1);
        }
    }

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (stack.getOrDefault(DataComponents.SCHEDULE_FIRE, false)) return;
        stack.set(DataComponents.CHARGING_PROGRESS, ParticleLance.CHARGING_TIME);
        stack.set(DataComponents.SCHEDULE_FIRE, true);

        if (world.isClient) return;
        world.playSound(null, SoundEvents.LASER_CHARGE_UP, 0.5);

        if (!attacker.isPlayer()) return;
        (attacker as ServerPlayerEntity).syncStack(stack);
    }

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const start = attacker.getPositionRef;
        const yaw = attacker.getYaw();
        const endX = start.x + Math.cos(yaw) * PhaseLasers.LASER_HEIGHT;
        const endY = start.y + Math.sin(yaw) * PhaseLasers.LASER_HEIGHT;

        const damage = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 20);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.5)
            .setHealthMulti(2);

        const mobs = world.getMobs();
        for (const mob of mobs) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                endX, endY,
                ParticleLance.LASER_WIDTH,
                pos.x, pos.y,
                mob.getWidth() / 2)
            ) {
                mob.takeDamage(damageSource, damage);
                if (mob.getShieldAmount() !== 0) continue;

                const effect = mob.getStatusEffect(StatusEffects.MELTDOWN);
                const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 8) : 0;

                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 80, amplifier), attacker);
            }
        }

        spawnLaser(world, start.x, start.y, endX, endY, this.getUiColor(), 4, 0.2);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM_MID, 0.6);
    }

    public override getUiColor(): string {
        return "#ff5d5d";
    }

    public override getDisplayName(): string {
        return '粒子光矛';
    }
}