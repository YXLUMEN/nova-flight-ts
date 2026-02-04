import {BossEntity} from "./BossEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";

export class TNTBossEntity extends BossEntity {
    public constructor(type: EntityType<TNTBossEntity>, world: World, worth: number, maxKillTime: number = 64) {
        super(type, world, worth, maxKillTime);
    }

    public override tick() {
        super.tick();
    }
}