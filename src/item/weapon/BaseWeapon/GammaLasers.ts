import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {squareDistVec2, thickLineCircleHit} from "../../../utils/math/math.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {ADSEntity} from "../../../entity/ADSEntity.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {PhaseLasers} from "../PhaseLasers.ts";
import type {LivingEntity} from "../../../entity/LivingEntity.ts";

export class GammaLasers extends BaseWeapon {
    public static readonly LASER_WIDTH = 3;

    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const yaw = attacker.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const start = attacker.getPositionRef;
        const end = new MutVec2(
            start.x + f * PhaseLasers.LASER_HEIGHT,
            start.y + g * PhaseLasers.LASER_HEIGHT
        );

        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 10);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.4)
            .setHealthMulti(1.5);

        const candidates: LivingEntity[] = [];
        for (const mob of world.getMobs()) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                GammaLasers.LASER_WIDTH,
                pos.x, pos.y, mob.getWidth())
            ) {
                candidates.push(mob);
                if (candidates.length > 32) break;
            }
        }

        candidates.sort((a, b) => {
            return squareDistVec2(start, a.getPositionRef) - squareDistVec2(start, b.getPositionRef);
        });

        const target = candidates[0];
        if (target) {
            target.takeDamage(damageSource, damage);

            const toTarget = target.getPositionRef.clone().subVec(start);
            const width = target.getWidth() / 2;
            const len = (toTarget.x * f + toTarget.y * g) - width;

            end.set(
                start.x + len * f,
                start.y + len * g,
            );

            if (target.getShieldAmount() === 0) {
                const effect = target.getStatusEffect(StatusEffects.MELTDOWN);
                const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 3) : 0;
                target.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 60, amplifier), attacker);
            }
        }

        ADSEntity.spawnInterceptPath(world, start, end, '#ffca59', GammaLasers.LASER_WIDTH, 0.2);
        world.spawnParticle(
            end.x, end.y,
            0, 0,
            8,
            80,
            0.5, 4,
            '#ffcbb7',
        );
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.4);
    }

    public override getUiColor(): string {
        return '#ffca59';
    }

    public override getDisplayName(): string {
        return '伽马激光';
    }
}