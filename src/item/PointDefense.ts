import {Item} from "./Item.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {DataComponents} from "../component/DataComponents.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import type {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import type {EntityDist} from "../apis/types.ts";
import {spawnLaserByVec} from "../utils/ServerEffect.ts";
import {Box} from "../utils/math/Box.ts";
import {EntityPredicates} from "../predicate/EntityPredicates.ts";

export class PointDefense extends Item {
    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (world.isClient || holder.age % 12 !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            return;
        }

        const holderPos = holder.getPositionRef;
        const validThreats: EntityDist<ProjectileEntity>[] = [];

        const box = Box.fromCenter(holderPos.x, holderPos.y, 256, 256);
        const entities = world.searchOtherEntities(holder, box, EntityPredicates.DEFENSE);
        for (const entity of entities) {
            if (!BallisticsUtils.isViableThreat(entity.getPositionRef, entity.getVelocityRef, holderPos)) continue;
            validThreats.push({
                entity: entity as ProjectileEntity,
                distSq: squareDistVec2(holderPos, entity.getPositionRef)
            });
            if (validThreats.length > 32) break;
        }

        if (validThreats.length === 0) return;
        validThreats.sort((a, b) => a.distSq - b.distSq);

        const damage = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
        const maxIntercepted = stack.getOrDefault(DataComponents.MAX_DEFENSE, 1);
        const limit = Math.min(maxIntercepted, validThreats.length);
        for (let i = 0; i < limit; i++) {
            const entity = validThreats[i].entity;

            entity.onIntercept(damage);
            spawnLaserByVec(world as ServerWorld, holderPos, entity.getPositionRef);
        }
    }
}