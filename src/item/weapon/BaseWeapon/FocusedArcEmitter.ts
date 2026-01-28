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
                mob.takeDamage(damageSource, damage + (mob.getHealth() * 0.2) | 0);
                initialTargets.push(mob);
            }
        }

        world.spawnEffect(null, new ArcEffect(
            start.x, start.y, endX, endY,
            0.2, 1,
            '#7f54ff'));

        world.playSound(null, SoundEvents.ARC_BURST);

        if (initialTargets.length === 0) return;

        // 连锁
        const range = stack.getOrDefault(DataComponentTypes.ATTACK_RANGE, 16384);
        const subHitCount = new Map<Entity, number>();
        const chainDamage = Math.floor(damage * 0.5);

        for (const source of initialTargets) {
            let targetCount = 0;
            const sourcePos = source.getPositionRef;

            for (const mob of mobs) {
                if (targetCount >= 3) break;
                if (mob === source || mob.isRemoved()) continue;

                const hitTime = subHitCount.get(mob) ?? 0;
                if (hitTime >= 2) continue;

                if (squareDistVec2(sourcePos, mob.getPositionRef) <= range) {
                    targetCount++;
                    subHitCount.set(mob, hitTime + 1);

                    mob.takeDamage(damageSource, chainDamage);
                    const targetPos = mob.getPositionRef;

                    world.spawnEffect(null, new ArcEffect(
                        sourcePos.x, sourcePos.y, targetPos.x, targetPos.y,
                        0.2, 1,
                        '#7f54ff',
                        1, 10
                    ));
                }
            }
        }
    }

    public override getUiColor(): string {
        return '#7f54ff';
    }

    public override getDisplayName(): string {
        return '聚能电弧发射器';
    }

    protected override getMuzzleParticles(): number {
        return 0;
    }
}