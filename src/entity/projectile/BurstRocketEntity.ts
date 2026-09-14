import {RocketEntity} from "./RocketEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {ExplosionVisual} from "../../world/element/explosion/ExplosionVisual.ts";
import {StatusEffectInstance} from "../effect/StatusEffectInstance.ts";
import {ExplosiveBuilder} from "../../world/element/explosion/ExplosiveBuilder.ts";

export class BurstRocketEntity extends RocketEntity {
    public override explosionDamage = 1;
    public override explosionRadius = 240;

    protected override explodeColor = "#ff6161";

    public override explode() {
        const configs = new ExplosiveBuilder()
            .noDecay()
            .sound(SoundEvents.BLAST_FAR)
            .effect(new StatusEffectInstance(StatusEffects.EROSION, 100, 1))
            .build();

        const world = this.getWorld();
        world.createExplosion(this, null,
            this.getX(), this.getY(),
            this.explosionDamage,
            configs,
            new ExplosionVisual(
                this.explosionRadius,
                this.explodeColor,
                3,
                2
            )
        );
        world.playSound(null, SoundEvents.MISSILE_EXPLOSION, 0.4);
    }

    protected override changeColor() {
        this.color.color = '#ff0000';
    }
}