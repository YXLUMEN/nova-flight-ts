import {MobEntity} from "./MobEntity.ts";
import {type World} from "../../world/World.ts";
import {type EntityType} from "../EntityType.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export class BaseEnemy extends MobEntity {
    public color = '#ff6b6b';

    public constructor(type: EntityType<BaseEnemy>, world: World, worth: number) {
        super(type, world, worth);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 2);
    }
}