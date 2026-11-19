import type {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {EntityDist} from "../type/types.ts";
import {spawnLaserByVec} from "../utils/render/LaserFx.ts";
import {isClient} from "../configs/RuntimeConfig.ts";
import {Item} from "./Item.ts";
import {DataComponents} from "../component/DataComponents.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {AABB} from "../utils/math/AABB.ts";
import {EntityPredicates} from "../world/predicate/EntityPredicates.ts";
import {ParticleEffects} from "../effect/particle/ParticleEffects.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";

export class PointDefense extends Item {
    public override inventoryTick(stack: ItemStack, world: ServerWorld, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (isClient || holder.age % 12 !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            return;
        }

        const holderPos = holder.positionRef;
        const validThreats: EntityDist<ProjectileEntity>[] = [];
        const range = stack.getOr(DataComponents.DEFENSE_RANGE, 256);
        const box = AABB.fromCenter(holderPos.x, holderPos.y, range, range);

        const entities = world.searchOtherEntities(holder, box, EntityPredicates.defense(holder));
        for (const entity of entities) {
            if (!BallisticsUtils.isViableThreat(entity.positionRef, entity.velocityRef, holderPos)) continue;
            validThreats.push({
                entity: entity as ProjectileEntity,
                distSq: holderPos.distSqTo(entity.positionRef)
            });
            if (validThreats.length > 32) break;
        }

        const noThreat = validThreats.length === 0;
        const canAttack = stack.getOr(DataComponents.DEFENSE_ACTIVE_ATTACK, false);
        if (noThreat && !canAttack) return;

        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 1);
        const source = world.getDamageSources().laser(holder);
        const maxIntercepted = stack.getOr(DataComponents.MAX_DEFENSE, 1);
        const limit = Math.min(maxIntercepted, validThreats.length);

        validThreats.sort((a, b) => a.distSq - b.distSq);
        for (let i = 0; i < limit; i++) {
            const entity = validThreats[i].entity;
            entity.onIntercept(damage, source);
            spawnLaserByVec(world as ServerWorld, holderPos, entity.positionRef);
        }

        if (!canAttack) return;
        const targets = this.filterAttack(world, box, holder, maxIntercepted);
        if (targets.length === 0) return;

        for (const entity of targets) {
            entity.takeDamage(source, damage);
            entity.addStatusEffect(new StatusEffectInstance(StatusEffects.MELTDOWN, 25), holder);
        }

        const task = world.scheduleInterval(0.05, () => {
            if (targets.length === 0) {
                task.cancel();
                return;
            }
            const entity = targets.pop()!;
            spawnLaserByVec(world as ServerWorld, holderPos, entity.positionRef, '#fff0a1', 2);
            world.spawnParticle(ParticleEffects.DECOY_FLASH, entity.positionRef, 5);
        });
    }

    private filterAttack(world: ServerWorld, box: AABB, holder: Entity, limit: number) {
        if (limit === 0) return [];
        const pos = holder.positionRef;
        const candidates = world.searchOtherEntities(holder, box, EntityPredicates.IS_ALIVE)
            .filter(e => e instanceof LivingEntity)
            .take(32)
            .toArray()
            .sort((a, b) => pos.distSqTo(a.positionRef) - pos.distSqTo(b.positionRef));
        candidates.length = Math.min(limit, candidates.length);
        return candidates;
    }
}