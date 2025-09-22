import type {DamageSource} from "../damage/DamageSource.ts";
import type {World} from "../../world/World.ts";
import {MobEntity} from "./MobEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";

export class TankEnemy extends MobEntity {
    public color = '#ff6b6b';
    private damageCooldown: number = 0;

    public constructor(type: EntityType<TankEnemy>, world: World, worth: number) {
        super(type, world, worth);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 32)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 10);
    }

    public override tick() {
        super.tick();
        if (this.damageCooldown > 0) this.damageCooldown -= 1;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const bypass = damageSource.isIn(DamageTypeTags.BYPASSES_INVULNERABLE);
        if (!bypass) {
            if (this.damageCooldown > 0) {
                damage *= 1 - (this.damageCooldown / 8) * 0.8;
            }

            // 限制单次最大伤害
            damage = Math.min(8, damage);
        }

        if (super.takeDamage(damageSource, damage)) {
            this.damageCooldown = 8;
            return true;
        }
        return false;
    }
}