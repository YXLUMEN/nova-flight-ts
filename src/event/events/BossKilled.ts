import {GameEvent} from "./GameEvent.ts";
import type {BossEntity} from "../../entity/mob/BossEntity.ts";

export class BossKilled extends GameEvent {
    public readonly boss: BossEntity | null;

    public constructor(boss: BossEntity | null = null) {
        super('entity:boss:killed');
        this.boss = boss;
    }
}