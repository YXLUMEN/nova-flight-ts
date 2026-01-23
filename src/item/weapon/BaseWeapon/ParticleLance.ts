import {type Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../../world/World.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {PhaseLasers} from "../PhaseLasers.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {PI2, rand, randInt, thickLineCircleHit} from "../../../utils/math/math.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {ADSEntity} from "../../../entity/ADSEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";

export class ParticleLance extends BaseWeapon {
    public static readonly LASER_WIDTH = 8;
    public static readonly CHARGING_TIME = 10;

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, _slot: number, selected: boolean): void {
        if (stack.getOrDefault(DataComponentTypes.SCHEDULE_FIRE, false)) {
            if (!selected) {
                stack.set(DataComponentTypes.SCHEDULE_FIRE, false);
                stack.set(DataComponentTypes.CHARGING_PROGRESS, 0);
                return;
            }

            const charging = stack.getOrDefault(DataComponentTypes.CHARGING_PROGRESS, 0) - 1;
            if (charging <= 0) {
                if (!world.isClient) this.onFire(stack, world as ServerWorld, holder);
                this.setCooldown(stack, this.getFireRate(stack));
                stack.set(DataComponentTypes.SCHEDULE_FIRE, false);
            } else if (world.isClient) {
                this.spawnMuzzle(world as ClientWorld, holder, 4);
            }
            stack.set(DataComponentTypes.CHARGING_PROGRESS, Math.max(charging, 0));
            return;
        }

        const cooldown = stack.getOrDefault(DataComponentTypes.COOLDOWN, 0);
        if (cooldown > 0 && this.shouldCooldown(stack)) {
            this.setCooldown(stack, cooldown - 1);
        }
    }

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (!attacker.isPlayer()) return;

        if (stack.getOrDefault(DataComponentTypes.SCHEDULE_FIRE, false)) return;
        stack.set(DataComponentTypes.CHARGING_PROGRESS, ParticleLance.CHARGING_TIME);
        stack.set(DataComponentTypes.SCHEDULE_FIRE, true);

        if (world.isClient) {
            return;
        }

        world.playSound(null, SoundEvents.LASER_CHARGEUP, 0.5);
        (attacker as ServerPlayerEntity).syncStack(stack);
    }

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const start = attacker.getPositionRef;
        const yaw = attacker.getYaw();
        const end = new MutVec2(
            start.x + Math.cos(yaw) * PhaseLasers.LASER_HEIGHT,
            start.y + Math.sin(yaw) * PhaseLasers.LASER_HEIGHT
        );

        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 20);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.5)
            .setHealthMulti(2);

        const mobs = world.getMobs();
        for (const mob of mobs) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                ParticleLance.LASER_WIDTH,
                pos.x, pos.y, mob.getWidth())
            ) {
                mob.takeDamage(damageSource, damage);
                if (mob.getShieldAmount() !== 0) continue;

                const effect = mob.getStatusEffect(StatusEffects.MELTDOWN);
                const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 8) : 0;

                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 80, amplifier), attacker);
            }
        }

        ADSEntity.spawnInterceptPath(world, start, end, this.getUiColor(), 4, 0.2);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM_MID, 0.6);
    }

    protected override spawnMuzzle(world: ClientWorld, entity: Entity, particles: number): void {
        const pos = entity.getPositionRef;
        const yaw = entity.getYaw();
        const offset = entity.getWidth() / 2;
        const x = Math.cos(yaw) * offset + pos.x;
        const y = Math.sin(yaw) * offset + pos.y;
        const color = this.getUiColor();

        for (let i = 0; i < particles; i++) {
            const angle = Math.random() * PI2;
            const radius = 30 + Math.random() * 16;

            const startX = x + Math.cos(angle) * radius;
            const startY = y + Math.sin(angle) * radius;

            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);

            const speed = -randInt(100, 210);

            world.addParticle(
                startX, startY,
                dirX * speed, dirY * speed,
                rand(0.4, 0.6), rand(2, 3),
                color, color,
                0.6, 80
            );
        }
    }

    public override getUiColor(): string {
        return "#ff5d5d";
    }

    public override getDisplayName(): string {
        return '粒子光矛';
    }
}