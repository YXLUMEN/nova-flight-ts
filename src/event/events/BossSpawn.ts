import {GameEvent} from "./GameEvent.ts";
import type {BossEntity} from "../../entity/mob/BossEntity.ts";

export class BossSpawn extends GameEvent {
    public readonly boss: BossEntity;

    public constructor(boss: BossEntity) {
        super('entity:boss:spawn');
        this.boss = boss;
    }
}