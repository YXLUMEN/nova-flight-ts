import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {squareDistVec2, thickLineCircleHit} from "../../../utils/math/math.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {PhaseLasers} from "../PhaseLasers.ts";
import {LivingEntity} from "../../../entity/LivingEntity.ts";
import {spawnLaserByVec} from "../../../utils/ServerEffect.ts";
import type {IVec} from "../../../utils/math/IVec.ts";
import {ParticleEffects} from "../../../effect/ParticleEffects.ts";

export class GammaLasers extends BaseWeapon {
    public static readonly LASER_WIDTH = 3;

    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const yaw = attacker.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const start = attacker.positionRef;
        const end = new MutVec2(
            start.x + f * PhaseLasers.LASER_HEIGHT,
            start.y + g * PhaseLasers.LASER_HEIGHT
        );

        const damage = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 10);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.4)
            .setHealthMulti(1.5);

        const hitBlock = world.raycast(start, end);

        const candidates: LivingEntity[] = [];
        for (const mob of world.getMobs()) {
            const pos = mob.positionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                GammaLasers.LASER_WIDTH,
                pos.x, pos.y,
                mob.getWidth() / 2)
            ) {
                candidates.push(mob);
                if (candidates.length > 32) break;
            }
        }

        candidates.sort((a, b) => {
            return squareDistVec2(start, a.positionRef) - squareDistVec2(start, b.positionRef);
        });

        const target = candidates[0];
        if (target) {
            if (!hitBlock.missed && squareDistVec2(start, target.positionRef) > squareDistVec2(start, hitBlock.pos)) {
                end.set(hitBlock.pos.x, hitBlock.pos.y);
                this.onHit(world, start, end);
                return;
            }

            target.takeDamage(damageSource, damage);

            const toX = target.getX() - start.x;
            const toY = target.getY() - start.y;
            const width = target.getWidth() / 2;
            const len = (toX * f + toY * g) - width;

            end.set(
                start.x + len * f,
                start.y + len * g,
            );

            if (target.getShieldAmount() === 0) {
                const effect = target.getStatusEffect(StatusEffects.MELTDOWN);
                const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 3) : 0;
                target.addEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 60, amplifier), attacker);
            }
        } else if (!hitBlock.missed) {
            end.set(hitBlock.pos.x, hitBlock.pos.y);
        }
        this.onHit(world, start, end);
    }

    private onHit(world: ServerWorld, start: IVec, end: IVec): void {
        spawnLaserByVec(world, start, end, '#ffca59', GammaLasers.LASER_WIDTH, 0.2);
        world.spawnPreparedParticle(ParticleEffects.POWER_FULL_BLOW, end, 8);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.4);
    }

    public override getUiColor(): string {
        return '#ffca59';
    }

    public override getDisplayName(): string {
        return '伽马激光';
    }
}