import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {randInt, squareDistVec2} from "../../../utils/math/math.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {World} from "../../../world/World.ts";
import {ArcEffect} from "../../../effect/ArcEffect.ts";
import type {MobEntity} from "../../../entity/mob/MobEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {thickLineCircleHit} from "../../../utils/math/collide.ts";

export class FocusedArcEmitter extends BaseWeapon {
    private readonly arcWidth = 5;
    private readonly arcLength = World.MAP_HEIGHT * 2;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const start = attacker.positionRef;
        const yaw = attacker.getYaw();
        const endX = start.x + Math.cos(yaw) * this.arcLength;
        const endY = start.y + Math.sin(yaw) * this.arcLength;

        const damage = randInt(4, stack.getOr(DataComponents.ATTACK_DAMAGE, 48));
        const damageSource = world.getDamageSources().arc(attacker);

        const initialTargets: MobEntity[] = [];
        const mobs = world.getMobs();

        // 主闪电
        for (const mob of mobs) {
            const pos = mob.positionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                endX, endY, this.arcWidth,
                pos.x, pos.y, mob.getWidth())
            ) {
                mob.takeDamage(damageSource, damage + mob.getHealth() * 0.2);
                initialTargets.push(mob);
            }
        }

        world.spawnVisual(null, new ArcEffect(
            start.x, start.y, endX, endY,
            0.2, 2,
            '#7f54ff'));

        world.playSound(null, SoundEvents.ARC_BURST);

        if (initialTargets.length === 0) return;

        const range = stack.getOr(DataComponents.ATTACK_RANGE, 16384);
        const subHitCount = new Map<Entity, number>();
        const chainDamage = damage * 0.5;

        // 在所有候选目标中连锁
        const arcs: ArcEffect[] = [];
        for (const source of initialTargets) {
            let targetCount = 0;
            const sourcePos = source.positionRef;

            for (const mob of mobs) {
                if (targetCount >= 3) break;
                if (mob === source || mob.isRemoved()) continue;

                const hitTime = subHitCount.get(mob) ?? 0;
                if (hitTime >= 2) continue;

                const mobPos = mob.positionRef;
                if (squareDistVec2(sourcePos, mobPos) <= range) {
                    targetCount++;
                    subHitCount.set(mob, hitTime + 1);

                    mob.takeDamage(damageSource, chainDamage);
                    const arc = new ArcEffect(
                        sourcePos.x, sourcePos.y, mobPos.x, mobPos.y,
                        0.2, 1.5,
                        '#7d89ff',
                        1, 10);

                    if (mob.isDead()) {
                        world.spawnVisual(null, arc);
                        continue;
                    }
                    arcs.push(arc);
                }
            }
        }

        if (arcs.length === 0) return;
        const schedule = world.scheduleInterval(0.05, () => {
            if (arcs.length === 0) {
                schedule.cancel();
                return;
            }

            let steps = 0;
            for (let i = arcs.length - 1; i >= 0; i--) {
                world.spawnVisual(null, arcs[i]);
                arcs[i] = arcs[arcs.length - 1];
                arcs.pop();
                if (++steps >= 3) break;
            }
        });
    }

    public override getUiColor(): string {
        return '#7f54ff';
    }

    protected override getMuzzleParticles(): number {
        return 0;
    }
}