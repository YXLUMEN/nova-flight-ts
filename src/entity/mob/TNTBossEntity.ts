import {BossEntity} from "./BossEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";

export class TNTBossEntity extends BossEntity {
    public constructor(type: EntityType<TNTBossEntity>, world: World, worth: number) {
        super(type, world, worth, 40);
    }

    public override tick() {
        super.tick();
    }
}