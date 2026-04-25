import {BaseWeapon} from "./BaseWeapon.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {randInt, wrapRadians} from "../../../utils/math/math.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {ArcEffect} from "../../../effect/ArcEffect.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import type {World} from "../../../world/World.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";

export class ArcEmitter extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const pos = attacker.positionRef;
        const yaw = attacker.getYaw();

        const range = stack.getOrDefault(DataComponents.ATTACK_RANGE, 65536);
        const candidates: { mob: Entity; distSq: number }[] = [];

        for (const mob of world.getMobs()) {
            if (mob.isRemoved()) continue;

            const mobPos = mob.positionRef;
            const dx = mobPos.x - pos.x;
            const dy = mobPos.y - pos.y;
            const distSq = dx * dx + dy * dy;

            if (distSq > range) continue;

            const angleToMob = Math.atan2(dy, dx);
            const diff = wrapRadians(angleToMob - yaw);

            // 54
            if (Math.abs(diff) <= 0.94247) {
                candidates.push({mob, distSq});
            }
        }

        if (candidates.length === 0) {
            this.randomArc(world, pos, yaw);
            return;
        }

        candidates.sort((a, b) => a.distSq - b.distSq);

        const damage = randInt(1, stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 10));
        const damageSource = world.getDamageSources().arc(attacker);
        const maxTarget = Math.min(6, candidates.length);

        for (let i = 0; i < maxTarget; i++) {
            const mob = candidates[i].mob;
            const mobPos = mob.positionRef;

            mob.takeDamage(damageSource, damage);
            world.spawnEffect(null, new ArcEffect(
                pos.x, pos.y,
                mobPos.x, mobPos.y,
                0.25, 0.8,
                '#5d9cff',
                1, 16
            ));
        }
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        world.playLoopSound(attacker, SoundEvents.ARC_LOOP, 0.4);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        world.stopLoopSound(attacker, SoundEvents.ARC_LOOP);
    }

    private randomArc(world: ServerWorld, pos: Vec2, yaw: number) {
        // 在 ±60° 内随机偏移
        const offset = yaw + (Math.random() - 0.5) * Math.PI / 1.5;
        const length = 48 + Math.random() * 64; // 48～112 像素

        const endX = pos.x + Math.cos(offset) * length;
        const endY = pos.y + Math.sin(offset) * length;

        world.spawnEffect(null, new ArcEffect(
            pos.x, pos.y,
            endX, endY,
            0.2, 0.6,
            '#5d9cff',
            1, 12
        ));
    }

    public override getUiColor(): string {
        return '#86b4ff';
    }

    public override getDisplayName(): string {
        return '电弧发射器';
    }

    protected override getMuzzleParticles(): number {
        return 0;
    }
}