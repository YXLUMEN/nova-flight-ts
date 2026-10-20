import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {StatusEffectInstance} from "../../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {LivingEntity} from "../../../entity/LivingEntity.ts";
import {spawnLaserByVec} from "../../../utils/render/LaserFx.ts";
import {ParticleEffects} from "../../../effect/particle/ParticleEffects.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";
import {LaserPulseItem} from "./LaserPulseItem.ts";

export class IonDisruptor extends LaserPulseItem {
    protected override laserWidth(): number {
        return 4;
    }

    protected override onHit(world: ServerWorld, start: Vec2, end: Vec2, attacker: Entity): void {
        spawnLaserByVec(world, start, end, '#66e0ff', this.laserWidth(), 0.18);

        const yaw = attacker.getYaw();
        world.spawnParticle(ParticleEffects.POWER_FULL_BLOW, end, 6, yaw + Math.PI);
        world.playSound(null, SoundEvents.LASER_FIRE_BEAM, 0.35);
    }

    protected override onHitEntity(stack: ItemStack, world: ServerWorld, target: LivingEntity, attacker: Entity) {
        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 6);
        const damageSource = world.getDamageSources()
            .laser(attacker)
            .setShieldMulti(1.6)
            .setHealthMulti(0.5);

        if (target.getShieldAmount() === 0) {
            const effect = target.getStatusEffect(StatusEffects.WEAKNESS);
            const amplifier = effect ? Math.min(effect.amplifier() + 1, 4) : 0;
            target.addStatusEffect(new StatusEffectInstance(StatusEffects.WEAKNESS, 100, amplifier), attacker);
        }
        target.takeDamage(damageSource, damage);
    }

    public override getUiColor(): string {
        return '#66e0ff';
    }
}
