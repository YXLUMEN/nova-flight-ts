import type {MobEntity} from "../mob/MobEntity.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {createCleanObj} from "../../utils/uit.ts";
import {getNearestEntity, wrappedDelta} from "../../utils/math/math.ts";
import {World} from "../../world/World.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";

export const Behavior = createCleanObj({
    Wander: 0,
    Chase: 1,
    Flee: 2,
    Simple: 3
} as const);

export class MobAI {
    public disable = false;
    private readonly dir = new MutVec2(1, 0);
    private targetPos = MutVec2.zero();
    private changeTimer = 0;
    private behavior: number = Behavior.Simple;

    public static simpleMove(mob: MobEntity) {
        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;

        const speed = mob.getMovementSpeed() * speedMultiplier;
        const vx = Math.sin(mob.age * 0.1) * 0.8 * speedMultiplier;

        mob.updateVelocity(speed, vx, mob.yStep);
    }

    public action(mob: MobEntity) {
        if (this.disable) return;

        const speedMultiplier = mob.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;
        const speed = mob.getMovementSpeed() * speedMultiplier;

        const isSimple = this.behavior === Behavior.Simple;
        if (!isSimple && (mob.age & 23) !== 0) this.chooseTarget(mob);

        switch (this.behavior) {
            case Behavior.Chase:
                this.moveToward(mob, this.targetPos, speed, false);
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

        if (!isSimple) this.faceTarget(mob, this.targetPos, 0.19634375, false);
    }

    public chooseTarget(mob: MobEntity) {
        const world = mob.getWorld();

        const pos = mob.getPositionRef;
        const target = getNearestEntity(pos, world.getPlayers());
        if (!target) return;

        const playerPos = target.getPositionRef;
        this.targetPos.set(playerPos.x, playerPos.y);

        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;
        const distSq = dx * dx + dy * dy;

        if (mob.isRangedAttacker()) {
            if (distSq < 230400) {
                this.setBehavior(mob, Behavior.Flee);
            } else {
                this.setBehavior(mob, Behavior.Wander);
            }
        } else {
            this.setBehavior(mob, Behavior.Chase);
        }
    }

    public wander(mob: MobEntity, speed: number): void {
        if (this.changeTimer-- <= 0) {
            this.dir.set(Math.random() - 0.5, Math.random() - 0.5);
            this.changeTimer = 50;
        }
        mob.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    public setBehavior(mob: MobEntity, behavior: number): void {
        this.behavior = behavior;

        const world = mob.getWorld();
        if (world.isClient) return;
        world.getNetworkChannel().send(new MobAiS2CPacket(mob.getId(), behavior));
    }

    public getBehavior(): number {
        return this.behavior;
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

    private faceTarget(mob: MobEntity, target: IVec, maxStep: number = 0.19634375, wrap = false): void {
        const pos = mob.getPositionRef;
        const dx = wrap ? wrappedDelta(target.x, pos.x, World.WORLD_W) : target.x - pos.x;
        const dy = target.y - pos.y;
        mob.setClampYaw(Math.atan2(dy, dx), maxStep);
    }
}