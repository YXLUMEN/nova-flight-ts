import {BulletEntity} from "./BulletEntity.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {ExplosionBehaviour} from "../../world/element/explosion/ExplosionConfigs.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import {ExplosionVisual} from "../../world/element/explosion/ExplosionVisual.ts";
import {ExplosiveBuilder} from "../../world/element/explosion/ExplosiveBuilder.ts";

export class BlastBullet extends BulletEntity {
    private static readonly BEHAVIOUR = new ExplosiveBuilder()
        .behaviour(ExplosionBehaviour.ONLY_DAMAGE)
        .noDecay()
        .build();

    private static readonly VISUAL = new ExplosionVisual(
        32,
        undefined,
        2,
        0,
        false
    );

    public onCollision(hitResult: HitResult) {
        super.onCollision(hitResult);

        if (hitResult.getType() === HitType.MISS) return;

        const world = this.getWorld();
        if (world.isClient) {
            world.playSound(null, SoundEvents.BLAST);
            world.addPreparedParticleVec(
                ParticleEffects.ASH,
                hitResult.pos,
                4
            );
            return;
        }

        const source = world.getDamageSources()
            .explosion(this, this.getOwner());
        world.createExplosion(
            this,
            source,
            hitResult.pos.x, hitResult.pos.y,
            2,
            BlastBullet.BEHAVIOUR, BlastBullet.VISUAL);
    }
}