import {Item} from "./Item.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import type {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import type {EntityDist} from "../apis/types.ts";
import {spawnLaserByVec} from "../utils/ServerEffect.ts";

export class PointDefense extends Item {
    public static readonly DEFENSE_RADIUS_SQ = 256 * 256;

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (world.isClient || holder.age % 12 !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            return;
        }

        const selfPos = holder.getPositionRef;

        const validThreats: EntityDist<ProjectileEntity>[] = [];
        for (const entity of world.getProjectiles()) {
            if (entity.getOwner() instanceof PlayerEntity) continue;

            const distSq = squareDistVec2(selfPos, entity.getPositionRef);
            if (
                distSq > PointDefense.DEFENSE_RADIUS_SQ ||
                !BallisticsUtils.isViableThreat(entity.getPositionRef, entity.getVelocityRef, selfPos)
            ) continue;

            validThreats.push({entity, distSq});
            if (validThreats.length > 32) break;
        }

        if (validThreats.length === 0) return;
        validThreats.sort((a, b) => a.distSq - b.distSq);

        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
        const maxIntercepted = stack.getOrDefault(DataComponentTypes.MAX_DEFENSE, 1);
        const limit = Math.min(maxIntercepted, validThreats.length);
        for (let i = 0; i < limit; i++) {
            const entity = validThreats[i].entity;

            entity.onIntercept(damage);
            spawnLaserByVec(world as ServerWorld, selfPos, entity.getPositionRef);
        }
    }
}