import {RocketEntity} from "./RocketEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {Entity} from "../Entity.ts";

export class FuseRocketEntity extends RocketEntity {
    private fuse: number;

    public constructor(type: EntityType<RocketEntity>, world: World, owner: Entity | null, damage: number = 8, fuse: number = 50) {
        super(type, world, owner, damage);
        this.fuse = fuse;
    }

    public override tick() {
        super.tick();
        if (this.fuse-- === 0) {
            this.explode();
            this.discard();
        }
    }
}