import {Item} from "./Item.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {World} from "../world/World.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {rand, squareDistVec2} from "../utils/math/math.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import type {EntityDist} from "../apis/types.ts";

export class FlakBattery extends Item {
    public static readonly BULLET_SPEED = 50;
    public static readonly DEFENCE_RADIUS_SQ = 256 * 256;

    private static readonly targets = new WeakMap<Entity, Set<ProjectileEntity>>();

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (world.isClient || (holder.age & 1) !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            FlakBattery.targets.get(holder)?.clear();
            return;
        }

        if ((holder.age & 15) !== 0) {
            FlakBattery.choseTarget(world as ServerWorld, holder, stack.getOrDefault(DataComponentTypes.MAX_DEFENSE, 1));
        }

        const targets = FlakBattery.targets.get(holder);
        if (!targets || targets.size === 0) return;

        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);

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
        ) + rand(-0.01745329, 0.01745329);

        const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, defender, damage);

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
        for (const entity of world.getProjectiles()) {
            if (entity.isRemoved() || entity.getOwner() instanceof PlayerEntity) continue;

            const distSq = squareDistVec2(selfPos, entity.getPositionRef);
            if (distSq > this.DEFENCE_RADIUS_SQ ||
                !BallisticsUtils.isViableThreat(entity.getPositionRef, entity.getVelocityRef, selfPos)
            ) continue;

            validThreats.push({entity, distSq});
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