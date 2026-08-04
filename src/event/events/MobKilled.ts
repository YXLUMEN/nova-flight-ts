import {GameEvent} from "./GameEvent.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";

export class MobKilled extends GameEvent {
    public readonly mob: MobEntity;
    public readonly damageSource: DamageSource

    public constructor(mob: MobEntity, damageSource: DamageSource) {
        super('entity:mob:killed');
        this.mob = mob;
        this.damageSource = damageSource;
    }
}