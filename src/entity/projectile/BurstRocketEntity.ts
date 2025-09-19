import {RocketEntity} from "./RocketEntity.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";

export class BurstRocketEntity extends RocketEntity {
    public override explosionDamage = 1;
    public override explosionRadius = 240;
    public override color = "#ff0000";
    protected override explodeColor = "#ff6161";

    public override explode() {
        const world = this.getWorld();
        world.events.emit(EVENTS.BOMB_DETONATE, {
            source: this,
            damage: this.explosionDamage,
            attacker: this.owner,
            pos: this.getPositionRef,
            explosionRadius: this.explosionRadius,
            fastSparks: 2,
            sparks: 3,
            explodeColor: this.explodeColor,
            statusEffect: {effect: StatusEffects.BURNING, duration: 100, amplifier: 1}
        });
        world.playSound(SoundEvents.MISSILE_EXPLOSION, 0.4);
    }
}