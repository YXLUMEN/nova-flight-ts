import type {MobEntity} from "../mob/MobEntity.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {createCleanObj} from "../../utils/uit.ts";
import {wrappedDelta} from "../../utils/math/math.ts";
import {World} from "../../world/World.ts";

export const Behavior = createCleanObj({
    Wander: 0,
    Chase: 1,
    Flee: 2,
    Simple: 3
} as const);

export class MobAI {
    private readonly dir = new MutVec2(1, 0);
    private targetPos = MutVec2.zero();
    private changeTimer = 0;
    private behavior: number = Behavior.Simple;

    public action(mob: MobEntity) {
        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;
        const speed = mob.getMovementSpeed() * speedMultiplier;
        const wrap = mob.getWorld().player?.voidEdge;

        const isSimple = this.behavior === Behavior.Simple;
        if (!isSimple && (mob.age & 63) !== 0) this.chooseTarget(mob);

        switch (this.behavior) {
            case Behavior.Chase:
                this.moveToward(mob, this.targetPos, speed, wrap);
                break;
            case Behavior.Flee:
                this.moveAway(mob, this.targetPos, speed);
                break;
            case Behavior.Simple:
                MobAI.simpleMove(mob);
                break;
            default:
                this.wander(mob, speed);
                break;
        }

        if (!isSimple) this.faceTarget(mob, this.targetPos, 0.0785375, wrap);
    }

    public chooseTarget(mob: MobEntity) {
        const player = mob.getWorld().player;
        if (!player) {
            this.behavior = Behavior.Wander;
            return;
        }

        const pos = mob.getPositionRef;
        const playerPos = player.getPositionRef;
        this.targetPos.set(playerPos.x, playerPos.y);

        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;
        const distSq = dx * dx + dy * dy;

        if (mob.isRangedAttacker()) {
            if (distSq < 230400) {
                this.behavior = Behavior.Flee;
            } else {
                this.behavior = Behavior.Wander;
            }
        } else {
            this.behavior = Behavior.Chase;
        }
    }

    public wander(mob: MobEntity, speed: number): void {
        if (this.changeTimer-- <= 0) {
            this.dir.set(Math.random() - 0.5, Math.random() - 0.5);
            this.changeTimer = 50;
        }
        mob.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private moveToward(mob: MobEntity, target: IVec, speed: number, wrap = false): void {
        const pos = mob.getPositionRef;
        const dx = wrap ? wrappedDelta(target.x, pos.x, World.WORLD_W) : target.x - pos.x;
        const dy = target.y - pos.y;
        this.dir.set(dx, dy).normalize();
        mob.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private moveAway(mob: MobEntity, target: IVec, speed: number): void {
        const pos = mob.getPositionRef;
        const dx = pos.x - target.x;
        const dy = pos.y - target.y;
        this.dir.set(dx, dy).normalize();
        mob.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private faceTarget(mob: MobEntity, target: IVec, maxStep: number = 0.0785375, wrap = false): void {
        const pos = mob.getPositionRef;
        const dx = wrap ? wrappedDelta(target.x, pos.x, World.WORLD_W) : target.x - pos.x;
        const dy = target.y - pos.y;
        mob.setClampYaw(Math.atan2(dy, dx), maxStep);
    }

    public setBehavior(behavior: number): void {
        this.behavior = behavior;
    }

    public getBehavior(): number {
        return this.behavior;
    }

    public static simpleMove(mob: MobEntity) {
        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;

        const speed = mob.getMovementSpeed() * speedMultiplier;
        const vx = Math.sin(mob.age * 0.05) * 0.8 * speedMultiplier;

        mob.updateVelocity(speed, vx, mob.yStep);
    }
}