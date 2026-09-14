import {RocketEntity} from "./RocketEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {Entity} from "../Entity.ts";
import {ExplosionConfigs} from "../../world/element/explosion/ExplosionConfigs.ts";

export class FuseRocketEntity extends RocketEntity {
    private fuse: number;

    public constructor(
        type: EntityType<RocketEntity>,
        world: World,
        owner: Entity | null,
        damage?: number,
        health?: number,
        behaviour?: ExplosionConfigs,
        fuse: number = 20,
    ) {
        super(type, world, owner, damage, health, behaviour);
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