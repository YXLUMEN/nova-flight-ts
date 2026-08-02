import {ProjectileEntity} from "./ProjectileEntity.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";

export class BulletEntity extends ProjectileEntity {
    public constructor(type: EntityType<BulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        super.onEntityHit(hitResult);

        if (this.isClient()) {
            this.getWorld().addPreparedParticleVec(
                ParticleEffects.SPARK,
                hitResult.pos,
                2,
                this.getYaw() + Math.PI
            );
            return;
        }

        const sources = this.getWorld().getDamageSources();
        hitResult.entity.takeDamage(
            sources.projectile(this, this.getOwner()),
            this.getHitDamage()
        );
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        super.onBlockHit(hitResult);

        if (this.isClient()) {
            this.getWorld().addPreparedParticleVec(
                ParticleEffects.SPARK,
                hitResult.pos,
                4,
                hitResult.direction.oppositeDir().normalAngle
            );
        }
    }
}