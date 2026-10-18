import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {isServer} from "../../configs/RuntimeConfig.ts";
import {World} from "../../world/World.ts";
import {BulletEntity} from "./BulletEntity.ts";
import {ParticleEffects} from "../../effect/particle/ParticleEffects.ts";

export class FastBulletEntity extends BulletEntity {
    public constructor(type: EntityType<FastBulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override tick() {
        super.tick();

        if (isServer) return;
        this.getWorld().addParticle(ParticleEffects.TRAJECTORY, this.prevX, this.prevY, 1);
    }
}