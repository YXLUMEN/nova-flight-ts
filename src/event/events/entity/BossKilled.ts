import {GameEvent} from "../GameEvent.ts";
import type {BossEntity} from "../../../entity/mob/BossEntity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class BossKilled extends GameEvent {
    public readonly world: ServerWorld;
    public readonly boss: BossEntity | null;

    public constructor(world: ServerWorld, boss: BossEntity | null = null) {
        super('entity:boss:killed');
        this.world = world;
        this.boss = boss;
    }
}