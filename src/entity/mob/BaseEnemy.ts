import {MobEntity} from "./MobEntity.ts";
import {type World} from "../../world/World.ts";
import {type EntityType} from "../EntityType.ts";

export class BaseEnemy extends MobEntity {
    public override speed = 110;
    public color = '#ff6b6b';

    public constructor(type: EntityType<BaseEnemy>, world: World, maxHealth: number, worth: number) {
        super(type, world, maxHealth, worth);
    }
}