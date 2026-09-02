import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {LivingEntity} from "../../../entity/LivingEntity.ts";
import {spawnLaserByVec} from "../../../utils/ServerEffect.ts";
import {ParticleEffects} from "../../../effect/ParticleEffects.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import {LaserPulseItem} from "./LaserPulseItem.ts";

export class IonDisruptor extends LaserPulseItem {
    protected override laserWidth(): number {
        return 4;
    }

    protected override onHit(world: ServerWorld, start: Vec2, end: Vec2): void {
        spawnLaserByVec(world, start, end, '#66e0ff', this.laserWidth(), 0.18);
        world.spawnPreparedParticle(ParticleEffects.POWER_FULL_BLOW, end, 6);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.35);
    }

    protected override onHitEntity(stack: ItemStack, world: ServerWorld, target: LivingEntity, attacker: Entity) {
        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 6);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(1.6)
            .setHealthMulti(0.7);
        target.takeDamage(damageSource, damage);

        const effect = target.getStatusEffect(StatusEffects.WEAKNESS);
        const amplifier = effect ? Math.min(effect.getAmplifier() + 1, 4) : 0;
        target.addEffect(new StatusEffectInstance(StatusEffects.WEAKNESS, 100, amplifier), attacker);
    }

    public override getUiColor(): string {
        return '#66e0ff';
    }
}
