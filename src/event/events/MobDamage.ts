import {GameEvent} from "./GameEvent.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";

export class MobDamage extends GameEvent {
    public readonly mob: MobEntity;
    public readonly damage: number;
    public readonly damageSource: DamageSource;

    public constructor(mob: MobEntity, damage: number, damageSource: DamageSource) {
        super('entity:mob:damage');
        this.mob = mob;
        this.damage = damage;
        this.damageSource = damageSource;
    }
}