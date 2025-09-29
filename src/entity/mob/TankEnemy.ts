import type {DamageSource} from "../damage/DamageSource.ts";
import type {World} from "../../world/World.ts";
import {MobEntity} from "./MobEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";

export class TankEnemy extends MobEntity {
    public override color = '#ff6b6b';
    private toughness: number = 0;

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
        if (this.toughness > 0) this.toughness -= 0.05;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const bypass = damageSource.isIn(DamageTypeTags.BYPASSES_INVULNERABLE);
        if (!bypass) {
            const reduction = Math.min(0.9, this.toughness * 0.1);
            damage *= 1 - reduction;
            this.toughness = Math.min(10, this.toughness + (damage / 2) | 0);
        }

        return super.takeDamage(damageSource, damage);
    }
}