import {BaseEnemy} from "./BaseEnemy.ts";
import type {DamageSource} from "../damage/DamageSource.ts";

export class TankEnemy extends BaseEnemy {
    private damageCooldown: number = 0;

    public override tick(dt: number) {
        super.tick(dt);
        if (this.damageCooldown > 0) this.damageCooldown -= 1;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.damageCooldown > 0) return false;

        damage = Math.max(1, (damage * 0.6) | 0);
        if (super.takeDamage(damageSource, damage)) {
            this.damageCooldown = 8;
            return true;
        }
        return false;
    }
}