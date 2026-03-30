import {Item} from "./Item.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {rand, squareDistVec2} from "../utils/math/math.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {DataComponents} from "../component/DataComponents.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import type {EntityDist} from "../apis/types.ts";
import {AABB} from "../utils/math/AABB.ts";
import {EntityPredicates} from "../predicate/EntityPredicates.ts";

export class FlakBattery extends Item {
    public static readonly BULLET_SPEED = 40;

    private static readonly targets = new WeakMap<Entity, Set<ProjectileEntity>>();

    public override inventoryTick(stack: ItemStack, world: ServerWorld, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (world.isClient || (holder.age & 1) !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            return;
        }

        if ((holder.age & 15) !== 0) {
            FlakBattery.choseTarget(world as ServerWorld, holder, stack.getOrDefault(DataComponents.MAX_DEFENSE, 1));
        }

        const targets = FlakBattery.targets.get(holder);
        if (!targets || targets.size === 0) return;

        const damage = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);

        for (const target of targets) {
            if (target.isRemoved()) {
                targets.delete(target);
                continue;
            }

            FlakBattery.intercept(world as ServerWorld, holder, target, damage);
        }
    }

    private static intercept(world: ServerWorld, defender: Entity, target: ProjectileEntity, damage: number) {
        const pos = defender.getPositionRef;
        const yaw = BallisticsUtils.getLeadYaw(
            pos,
            target.getPositionRef,
            target.getVelocityRef,
            FlakBattery.BULLET_SPEED
        ) + rand(-0.03490658, 0.03490658);

        const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, defender, damage, 10);

        const f = Math.cos(yaw);
        const g = Math.sin(yaw);
        bullet.setVelocity(f * FlakBattery.BULLET_SPEED, g * FlakBattery.BULLET_SPEED);
        bullet.setYaw(yaw);
        const offset = defender.getWidth() / 2;
        bullet.setPosition(
            pos.x + f * offset + f,
            pos.y + g * offset + g,
        );

        (world as ServerWorld).spawnEntity(bullet);
    }

    private static choseTarget(world: ServerWorld, holder: Entity, limit: number = 1) {
        const selfPos = holder.getPositionRef;

        let targets = this.targets.get(holder);
        if (!targets) {
            targets = new Set();
            this.targets.set(holder, targets);
        } else targets.clear();

        const validThreats: EntityDist<ProjectileEntity>[] = [];

        const box = AABB.fromCenter(selfPos.x, selfPos.y, 256, 256);
        const entities = world.searchOtherEntities(holder, box, EntityPredicates.DEFENSE);

        for (const entity of entities) {
            if (!BallisticsUtils.isViableThreat(entity.getPositionRef, entity.getVelocityRef, selfPos)) continue;
            validThreats.push({
                entity: entity as ProjectileEntity,
                distSq: squareDistVec2(selfPos, entity.getPositionRef)
            });
            if (validThreats.length > 32) break;
        }

        if (validThreats.length === 0) return;
        validThreats.sort((a, b) => a.distSq - b.distSq);

        const count = Math.min(limit, validThreats.length);
        for (let i = 0; i < count; i++) {
            targets.add(validThreats[i].entity);
        }
    }
}