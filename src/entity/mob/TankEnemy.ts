import type {DamageSource} from "../damage/DamageSource.ts";
import type {World} from "../../world/World.ts";
import {MobEntity} from "./MobEntity.ts";
import type {EntityType} from "../EntityType.ts";

export class TankEnemy extends MobEntity {
    private damageCooldown: number = 0;
    public color = '#ff6b6b';

    public constructor(type: EntityType<TankEnemy>, world: World, worth: number) {
        super(type, world, worth);
    }

    public override tick(dt: number) {
        super.tick(dt);
        if (this.damageCooldown > 0) this.damageCooldown -= 1;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0) return false;

        damage = Math.min(8, damage);
        if (super.takeDamage(damageSource, damage)) {
            this.damageCooldown = 8;
            return true;
        }
        return false;
    }
}