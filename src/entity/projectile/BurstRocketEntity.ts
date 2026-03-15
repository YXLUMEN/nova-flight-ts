import {RocketEntity} from "./RocketEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {BehaviourEnum, ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";

export class BurstRocketEntity extends RocketEntity {
    public override explosionDamage = 1;
    public override explosionRadius = 240;
    public override color = "#ff0000";
    protected override explodeColor = "#ff6161";

    public override explode() {
        const world = this.getWorld();
        world.createExplosion(this, null,
            this.getX(), this.getY(),
            this.explosionDamage,
            new ExplosionBehavior(
                BehaviourEnum.ONLY_DAMAGE,
                undefined,
                false,
                true,
                new StatusEffectInstance(StatusEffects.EROSION, 100, 1)
            ),
            new ExplosionVisual(
                this.explosionRadius,
                this.explodeColor,
                3,
                2
            )
        );
        world.playSound(null, SoundEvents.MISSILE_EXPLOSION, 0.4);
    }
}