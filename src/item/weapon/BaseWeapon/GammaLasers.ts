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

export class GammaLasers extends LaserPulseItem {
    protected override laserWidth(): number {
        return 3;
    }

    protected override onHit(world: ServerWorld, start: Vec2, end: Vec2): void {
        spawnLaserByVec(world, start, end, '#ffca59', this.laserWidth(), 0.2);
        world.spawnPreparedParticle(ParticleEffects.POWER_FULL_BLOW, end, 8);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.4);
    }

    protected override onHitEntity(stack: ItemStack, world: ServerWorld, target: LivingEntity, attacker: Entity) {
        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 10);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(0.4)
            .setHealthMulti(1.5);
        target.takeDamage(damageSource, damage);

        if (target.getShieldAmount() !== 0) return;
        const effect = target.getStatusEffect(StatusEffects.MELTDOWN);
        const amplifier = effect ? Math.min(effect.amplifier() + 1, 3) : 0;
        target.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 60, amplifier), attacker);
    }

    public override getUiColor(): string {
        return '#ffca59';
    }
}