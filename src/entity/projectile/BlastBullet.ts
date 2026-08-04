import {BulletEntity} from "./BulletEntity.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {ExplosionBehavior, ExplosionBehaviour} from "../../world/element/explosion/ExplosionBehavior.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import {ExplosionVisual} from "../../world/element/explosion/ExplosionVisual.ts";

export class BlastBullet extends BulletEntity {
    private static readonly behaviour = new ExplosionBehavior(
        ExplosionBehaviour.ONLY_DAMAGE,
        undefined,
        false,
        false
    );
    private static readonly visual = new ExplosionVisual(
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
            BlastBullet.behaviour, BlastBullet.visual);
    }
}