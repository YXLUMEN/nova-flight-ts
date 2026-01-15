import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {randInt, squareDistVec2, thickLineCircleHit} from "../../../utils/math/math.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {World} from "../../../world/World.ts";
import {ArcEffect} from "../../../effect/ArcEffect.ts";
import type {MobEntity} from "../../../entity/mob/MobEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class FocusedArcEmitter extends BaseWeapon {
    private readonly arcWidth = 5;
    private readonly arcLength = World.WORLD_H * 2;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const start = attacker.getPositionRef;
        const yaw = attacker.getYaw();
        const endX = start.x + Math.cos(yaw) * this.arcLength;
        const endY = start.y + Math.sin(yaw) * this.arcLength;

        const damage = randInt(4, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 48));
        const chainDamage = Math.floor(damage * 0.5);
        const damageSource = world.getDamageSources().arc(attacker);

        const initialTargets: MobEntity[] = [];
        const mobs = world.getMobs();

        // 主闪电
        for (const mob of mobs) {
            const pos = mob.getPositionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                endX, endY, this.arcWidth,
                pos.x, pos.y, mob.getWidth())
            ) {
                mob.takeDamage(damageSource, damage);
                initialTargets.push(mob);
            }
        }

        // 连锁
        const subHitCount = new Map<Entity, number>();

        for (const source of initialTargets) {
            const candidates: Entity[] = [];
            const sourcePos = source.getPositionRef;

            for (const mob of mobs) {
                if (mob === source || mob.isRemoved() || (subHitCount.get(mob) ?? 0) >= 2) continue;
                if (squareDistVec2(sourcePos, mob.getPositionRef) <= 16384) {
                    candidates.push(mob);
                }
            }

            if (candidates.length === 0) continue;

            const t = Math.min(3, candidates.length);
            for (let i = 0; i < t; i++) {
                const j = Math.floor(Math.random() * candidates.length);
                const s = candidates.length - 1 - i;

                [candidates[j], candidates[s]] = [candidates[s], candidates[j]];
            }

            const startIndex = candidates.length - t;
            for (let i = startIndex; i < candidates.length; i++) {
                const target = candidates[i];

                const count = subHitCount.get(target) ?? 0;
                subHitCount.set(target, count + 1);

                target.takeDamage(damageSource, chainDamage);
                const targetPos = target.getPositionRef;

                world.spawnEffect(null, new ArcEffect(
                    sourcePos.x, sourcePos.y, targetPos.x, targetPos.y,
                    0.2, 1,
                    '#7f54ff',
                    1, 10
                ));

            }
        }

        world.spawnEffect(null, new ArcEffect(
            start.x, start.y, endX, endY,
            0.2, 1,
            '#7f54ff'));

        world.playSound(null, SoundEvents.ARC_BURST);
    }

    public override getUiColor(): string {
        return '#7f54ff';
    }

    public override getDisplayName(): string {
        return '聚能电弧发射器';
    }
}