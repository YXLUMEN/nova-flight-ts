import {BossEntity} from "./BossEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";

/**
 * **WIP**
 *
 * 在区域内移动,和玩家保持距离.
 * 技能组为: 区域轰炸、发射鱼雷、引力陷阱(拉拽玩家)
 * */
export class TNTBossEntity extends BossEntity {
    public constructor(type: EntityType<TNTBossEntity>, world: World, worth: number) {
        super(type, world, worth, 40);
    }

    public override tick() {
        super.tick();
    }
}