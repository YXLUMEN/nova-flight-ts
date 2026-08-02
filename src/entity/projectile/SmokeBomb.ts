import {BulletEntity} from "./BulletEntity.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";

export class SmokeBomb extends BulletEntity {
    public constructor(type: EntityType<SmokeBomb>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override tick() {
        super.tick();

        if (this.isClient()) {
            this.getWorld().addPreparedParticle(
                ParticleEffects.ASH,
                this.prevX, this.prevY,
                2
            );
        }
    }

    public override onCollision(hitResult: HitResult) {
        super.onCollision(hitResult);
        if (hitResult.getType() === HitType.MISS) return;

        const world = this.getWorld();
        world.addPreparedParticleVec(
            ParticleEffects.LARGE_SMOKE,
            this.positionRef,
            5
        );
    }
}