import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import type {EntityType} from "../EntityType.ts";
import {BulletEntity} from "./BulletEntity.ts";
import {type HitResult, HitType} from "../../world/collision/HitResult.ts";
import {ParticleEffects} from "../../effect/particle/ParticleEffects.ts";
import {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";

export class SmokeBomb extends BulletEntity {
    public constructor(type: EntityType<SmokeBomb>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override tick() {
        super.tick();

        if (this.isClient()) {
            this.getWorld().addParticle(
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

    public override onIntercept(damage: number, source: DamageSource) {
        super.onIntercept(damage, source);
        if (source.isIn(DamageTypeTags.INTERFERENCE_PROJECT)) return;
        this.release();
    }

    private release() {
        const world = this.getWorld();
        if (world.isClient) return;

        (world as ServerWorld).spawnParticle(
            ParticleEffects.LARGE_SMOKE,
            this.positionRef,
            5
        );
    }
}