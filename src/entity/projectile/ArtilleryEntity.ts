import {FastBulletEntity} from "./FastBulletEntity.ts";
import {type Entity} from "../Entity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {Techs} from "../../tech/Techs.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import type {BlockChange} from "../../world/map/BlockChange.ts";
import {ServerCommonHandler} from "../../server/network/handler/ServerCommonHandler.ts";
import {BatchBlockChangesPacket} from "../../network/packet/BatchBlockChangesPacket.ts";

export class ArtilleryEntity extends FastBulletEntity {
    public override noClip = true;
    private readonly hit = new WeakSet<Entity>();

    protected override onEntityHit(hitResult: EntityHitResult): void {
        const entity = hitResult.entity;
        if (this.hit.has(entity)) return;
        this.hit.add(entity);

        const world = this.getWorld();
        const sources = world.getDamageSources();
        const owner = this.getOwner();

        const hitDamage = this.getHitDamage();
        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked(Techs.ANTIMATTER_WARHEAD)) {
            let damage = hitDamage;
            if (entity instanceof LivingEntity) damage = hitDamage + (entity.getMaxHealth() * 0.08) | 0;
            else damage *= 2;
            entity.takeDamage(sources.kinetic(this, owner), damage);
            return;
        }

        entity.takeDamage(sources.kinetic(this, owner), hitDamage);
        if (!world.isClient) {
            (world as ServerWorld).spawnParticle(
                this.getX(), this.getY(), 0, 0,
                6, 100, 0.5, 4,
                '#ffd8b6'
            );
        }
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        super.onBlockHit(hitResult);

        const world = this.getWorld();
        if (world.isClient || hitResult.missed) return;
        const map = world.getMap();
        const x = hitResult.blockPos.getX(), y = hitResult.blockPos.getY();
        const changes: BlockChange[] = [];
        for (let i = -2; i < 2; i++) {
            for (let j = -2; j < 2; j++) {
                map.set(x + i, y + j, 0);
                changes.push({type: 0, x: x + i, y: y + j});
            }
        }
        const channel = world.getNetworkChannel();
        ServerCommonHandler.buildBatchWithEst(changes, () => 9, BatchBlockChangesPacket.from)
            .forEach(packet => channel.send(packet));
    }
}