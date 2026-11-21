import type {EntityDist} from "../type/types.ts";
import type {ItemStack} from "./ItemStack.ts";
import type {Entity} from "../entity/Entity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import type {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import {rand} from "../utils/math/math.ts";
import {isClient} from "../configs/RuntimeConfig.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {Item} from "./Item.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {BallisticsUtils} from "../utils/math/BallisticsUtils.ts";
import {DataComponents} from "../component/DataComponents.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {AABB} from "../utils/math/AABB.ts";
import {EntityPredicates} from "../world/predicate/EntityPredicates.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {SoundEventS2CPacket} from "../network/packet/s2c/SoundEventS2CPacket.ts";

export class FlakBattery extends Item {
    private readonly targets: WeakMap<Entity, Set<ProjectileEntity>> = new WeakMap();

    public override inventoryTick(stack: ItemStack, world: ServerWorld, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (isClient) {
            if (!holder.isPlayer()) return;

            // play reload sound effect at client
            if (holder.cooldownManager.getCooldownTicks(this) === 10) {
                world.playSound(null, SoundEvents.SHELL_RELOAD, 0.6);
            }
            return;
        }

        if ((holder.age & 1) !== 0) return;

        if (holder instanceof LivingEntity && holder.hasStatusEffect(StatusEffects.EMC_STATUS)) {
            return;
        }

        if (holder.isPlayer()) {
            // player ammo limit
            if (holder.cooldownManager.isCoolingDown(this)) return;

            if (stack.getOr(DataComponents.RELOADING, false)) {
                stack.setDurability(stack.getMaxDurability());
                stack.remove(DataComponents.RELOADING);
                (holder as ServerPlayerEntity).syncStack(stack);
            }
        }

        if ((holder.age & 15) !== 0) {
            const range = stack.getOr(DataComponents.DEFENSE_RANGE, 256);
            const limit = stack.getOr(DataComponents.MAX_DEFENSE, 1);
            this.choseTarget(world as ServerWorld, holder, range, limit);
        }

        const targets = this.targets.get(holder);
        if (!targets || targets.size === 0) return;

        const damage = stack.getOr(DataComponents.ATTACK_DAMAGE, 1);
        const speed = stack.getOr(DataComponents.BALLISTIC_SPEED, 40);

        for (const target of targets) {
            if (target.isRemoved()) {
                targets.delete(target);
                continue;
            }

            this.intercept(world as ServerWorld, holder, target, damage, speed);
        }

        if (!holder.isPlayer()) return;
        const player = holder as ServerPlayerEntity;

        const left = stack.getDurability() - 1;
        stack.setDurability(left);
        if (left > 0) return;

        stack.set(DataComponents.RELOADING, true);
        player.cooldownManager.set(this, 40);
        player.networkHandler.send(new SoundEventS2CPacket(SoundEvents.BARREL_OPEN, 0.8, 1));
        player.syncStack(stack);
    }

    private intercept(world: ServerWorld, defender: Entity, target: ProjectileEntity, damage: number, ballisticSpeed: number) {
        const pos = defender.positionRef;
        const yaw = BallisticsUtils.getLeadYaw(
            pos,
            target.positionRef,
            target.velocityRef,
            ballisticSpeed
        ) + rand(-0.03490658, 0.03490658);

        const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, defender, damage, 10);

        const f = Math.cos(yaw);
        const g = Math.sin(yaw);
        bullet.setVelocity(f * ballisticSpeed, g * ballisticSpeed);
        bullet.setYaw(yaw);
        const offset = defender.getWidth() / 2;
        bullet.setPosition(
            pos.x + f * offset + f,
            pos.y + g * offset + g,
        );

        (world as ServerWorld).spawnEntity(bullet);
    }

    private choseTarget(world: ServerWorld, holder: Entity, range: number, limit: number) {
        const selfPos = holder.positionRef;
        const targets = this.targets.getOrInsertComputed(holder, () => new Set());
        targets.clear();

        const validThreats: EntityDist<ProjectileEntity>[] = [];
        const box = AABB.fromCenter(selfPos.x, selfPos.y, range, range);
        const entities = world.searchOtherEntities(holder, box, EntityPredicates.defense(holder));

        for (const entity of entities) {
            if (!BallisticsUtils.isViableThreat(entity.positionRef, entity.velocityRef, selfPos)) continue;
            validThreats.push({
                entity: entity as ProjectileEntity,
                distSq: selfPos.distSqTo(entity.positionRef)
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

    public override onRemove(stack: ItemStack, user: LivingEntity) {
        super.onRemove(stack, user);
        this.targets.delete(user);
    }
}