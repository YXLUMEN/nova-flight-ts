import {FastBulletEntity} from "./FastBulletEntity.ts";
import {type Entity} from "../Entity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import {BlockChangeS2CPacket} from "../../network/packet/s2c/BlockChangeS2CPacket.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";

export class ArtilleryEntity extends FastBulletEntity {
    public override noClip = true;
    private readonly hit = new WeakSet<Entity>();

    protected override onEntityHit(hitResult: EntityHitResult): void {
        if (this.isClient()) return;

        const entity = hitResult.entity;
        if (this.hit.has(entity)) return;
        this.hit.add(entity);

        const world = this.getWorld();
        const owner = this.getOwner();

        const source = world.getDamageSources().kinetic(this, owner);
        entity.takeDamage(source, this.getHitDamage());
        (world as ServerWorld).spawnPreparedParticle(ParticleEffects.POWER_FULL_BLOW, hitResult.pos, 6);
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        super.onBlockHit(hitResult);

        const world = this.getWorld();
        if (world.isClient || hitResult.missed) return;

        world.getMap().setBlock(hitResult.blockPos, 0);
        world.sendPacket(BlockChangeS2CPacket.from(0, hitResult.blockPos));
    }
}