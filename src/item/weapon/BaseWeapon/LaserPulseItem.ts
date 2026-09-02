import {BaseWeapon} from "./BaseWeapon.ts";
import type {ItemStack} from "../../ItemStack.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import {PhaseLasers} from "../PhaseLasers.ts";
import {LivingEntity} from "../../../entity/LivingEntity.ts";
import {thickLineCircleHit} from "../../../utils/math/collide.ts";
import {squareDistVec2} from "../../../utils/math/math.ts";
import type {Vec2} from "../../../utils/math/Vec2.ts";

export abstract class LaserPulseItem extends BaseWeapon {
    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const yaw = attacker.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const start = attacker.positionRef;
        const end = new MutVec2(
            start.x + f * PhaseLasers.LASER_HEIGHT,
            start.y + g * PhaseLasers.LASER_HEIGHT
        );

        const hitBlock = world.raycast(start, end);
        const width = this.laserWidth();

        const candidates: LivingEntity[] = [];
        for (const mob of world.getMobs()) {
            const pos = mob.positionRef;
            if (!mob.isRemoved() && thickLineCircleHit(
                start.x, start.y,
                end.x, end.y,
                width,
                pos.x, pos.y,
                mob.getWidth() / 2)
            ) {
                candidates.push(mob);
                if (candidates.length > 32) break;
            }
        }

        candidates.sort((a, b) => {
            return squareDistVec2(start, a.positionRef) - squareDistVec2(start, b.positionRef);
        });

        const target = candidates[0];
        if (target) {
            if (!hitBlock.missed && squareDistVec2(start, target.positionRef) > squareDistVec2(start, hitBlock.pos)) {
                end.set(hitBlock.pos.x, hitBlock.pos.y);
                this.onHit(world, start, end);
                return;
            }

            this.onHitEntity(stack, world, target, attacker);

            const toX = target.getX() - start.x;
            const toY = target.getY() - start.y;
            const width = target.getWidth() / 2;
            const len = (toX * f + toY * g) - width;

            end.set(
                start.x + len * f,
                start.y + len * g,
            );
        } else if (!hitBlock.missed) {
            end.set(hitBlock.pos.x, hitBlock.pos.y);
        }
        this.onHit(world, start, end);
    }

    protected abstract laserWidth(): number;

    protected abstract onHit(world: ServerWorld, start: Vec2, end: Vec2): void;

    protected abstract onHitEntity(stack: ItemStack, world: ServerWorld, target: LivingEntity, attacker: Entity): void;
}