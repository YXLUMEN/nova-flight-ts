import {RocketEntity} from "./RocketEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";

export class BurstRocketEntity extends RocketEntity {
    public override explosionDamage = 1;
    public override explosionRadius = 240;
    public override color = "#ff0000";
    protected override explodeColor = "#ff6161";

    public override explode() {
        const world = this.getWorld();
        world.createExplosion(this, null, this.getX(), this.getY(), {
            damage: this.explosionDamage,
            attacker: this.getOwner(),
            explosionRadius: this.explosionRadius,
            fastSparks: 2,
            sparks: 3,
            explodeColor: this.explodeColor,
            statusEffect: {effect: StatusEffects.BURNING, duration: 100, amplifier: 1}
        });

        world.playSound(null, SoundEvents.MISSILE_EXPLOSION, 0.4);
    }
}