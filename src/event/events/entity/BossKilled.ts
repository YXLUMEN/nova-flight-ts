import {GameEvent} from "../GameEvent.ts";
import type {BossEntity} from "../../../entity/mob/BossEntity.ts";
import type {World} from "../../../world/World.ts";

export class BossKilled extends GameEvent {
    public readonly world: World;
    public readonly boss: BossEntity | null;

    public constructor(world: World, boss: BossEntity | null = null) {
        super('entity:boss:killed');
        this.world = world;
        this.boss = boss;
    }
}