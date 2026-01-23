import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {thickLineCircleHit} from "../../../utils/math/math.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {ADSEntity} from "../../../entity/ADSEntity.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {PhaseLasers} from "../PhaseLasers.ts";

export class GammaLasers extends BaseWeapon {
    public static readonly LASER_WIDTH = 6;

    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const start = attacker.getPositionRef;
        const yaw = attacker.getYaw();
        const end = new MutVec2(
            start.x + Math.cos(yaw) * PhaseLasers.LASER_HEIGHT,
            start.y + Math.sin(yaw) * PhaseLasers.LASER_HEIGHT
        );

        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 10);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.4)
            .setHealthMulti(1.8);

        const mobs = world.getMobs();
        for (const mob of mobs) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                GammaLasers.LASER_WIDTH,
                pos.x, pos.y, mob.getWidth())
            ) {
                mob.takeDamage(damageSource, damage);
                end.set(pos.x, pos.y);

                if (mob.getShieldAmount() !== 0) break;

                const effect = mob.getStatusEffect(StatusEffects.MELTDOWN);
                const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 3) : 0;

                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 60, amplifier), attacker);
                break;
            }
        }

        ADSEntity.spawnInterceptPath(world, start, end, '#ffca59', 3, 0.2);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.4);
    }

    public override getUiColor(): string {
        return '#ffca59';
    }

    public override getDisplayName(): string {
        return '伽马激光';
    }
}