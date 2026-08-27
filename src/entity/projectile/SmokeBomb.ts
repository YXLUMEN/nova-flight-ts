import {BulletEntity} from "./BulletEntity.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

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
                1
            );
        }
    }

    public override onCollision(hitResult: HitResult) {
        super.onCollision(hitResult);
        if (hitResult.getType() === HitType.MISS) return;
        this.release();
    }

    public override onIntercept(damage: number) {
        super.onIntercept(damage);
        this.release();
    }

    private release() {
        const world = this.getWorld();
        if (world.isClient) return;

        (world as ServerWorld).spawnPreparedParticle(
            ParticleEffects.LARGE_SMOKE,
            this.positionRef,
            5
        );
    }
}