import {BulletEntity} from "./BulletEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {Entity} from "../Entity.ts";

export class FastBulletEntity extends BulletEntity {
    public constructor(type: EntityType<FastBulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override tick() {
        super.tick();

        if (!this.getWorld().isClient) return;
        this.getWorld().addParticle(
            this.prevX, this.prevY,
            0, 0,
            0.5, 2,
            '#fffce9', '#bcbcbc'
        );
    }
}