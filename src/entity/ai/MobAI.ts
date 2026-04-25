import type {MobEntity} from "../mob/MobEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {config} from "../../utils/uit.ts";
import {getNearestEntityByVec} from "../../utils/math/math.ts";
import {Random} from "../../utils/math/Random.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export const AiBehavior = config({
    Wander: 0,
    Chase: 1,
    Flee: 2,
    Simple: 3
} as const);

export class MobAI {
    private disable = false;

    private readonly entity: MobEntity;
    private readonly dir = new MutVec2(1, 0);
    private readonly targetPos = MutVec2.zero();
    private readonly random: Random;

    private changeTimer = 0;
    private behavior: number = AiBehavior.Simple;

    public constructor(entity: MobEntity, seed: number = 6) {
        this.entity = entity;
        this.random = new Random(seed);
    }

    public tick(): void {
        if (this.disable) return;

        const speedMultiplier = this.entity.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;
        const speed = this.entity.getMovementSpeed() * speedMultiplier;

        switch (this.behavior) {
            case AiBehavior.Chase:
                this.moveToward(speed);
                this.faceTarget(this.targetPos, 0.19634375);
                break;
            case AiBehavior.Flee:
                this.moveAway(this.targetPos, speed);
                this.faceTarget(this.targetPos, 0.19634375);
                break;
            case AiBehavior.Simple:
                this.simpleMove();
                break;
            default:
                this.wander(speed);
                this.faceTarget(this.targetPos, 0.19634375);
                break;
        }

        this.entity.needSync = true;
    }

    public decision() {
        if (this.disable) return;

        if (this.behavior !== AiBehavior.Simple && (this.entity.age & 23) !== 0) {
            this.chooseTarget();
        }
    }

    private chooseTarget() {
        const world = this.entity.getWorld();
        if (world.isClient) return;

        const pos = this.entity.positionRef;
        const target = getNearestEntityByVec(pos, world.getPlayers());
        if (!target) return;

        const playerPos = target.positionRef;
        this.targetPos.set(playerPos.x, playerPos.y);

        const dx = playerPos.x - pos.x;
        const dy = playerPos.y - pos.y;
        const distSq = dx * dx + dy * dy;

        if (this.entity.isRangedAttacker()) {
            if (distSq < 230400) {
                this.setBehavior(AiBehavior.Flee);
            } else {
                this.setBehavior(AiBehavior.Wander);
            }
        } else {
            this.setBehavior(AiBehavior.Chase);
        }
    }

    public setSeed(seed: number): void {
        this.random.setState(seed);
    }

    public isDisabled(): boolean {
        return this.disable;
    }

    public setDisable(value: boolean): void {
        this.disable = value;
    }

    public setTarget(pos: Vec2) {
        this.targetPos.set(pos.x, pos.y);
    }

    public setBehavior(behavior: number): void {
        this.behavior = behavior;
    }

    public getBehavior(): number {
        return this.behavior;
    }

    public isSimple() {
        return this.behavior === AiBehavior.Simple;
    }

    private wander(speed: number): void {
        if (this.changeTimer-- <= 0) {
            this.dir.set(this.random.nextFloat() - 0.5, this.random.nextFloat() - 0.5);
            this.changeTimer = 50;
        }
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private moveToward(speed: number): void {
        if (speed <= 0) return;
        const yaw = this.entity.getYaw();
        this.dir.set(Math.cos(yaw), Math.sin(yaw));
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private moveAway(target: Vec2, speed: number): void {
        if (speed <= 0) return;
        const pos = this.entity.positionRef;
        const dx = pos.x - target.x;
        const dy = pos.y - target.y;
        this.dir.set(dx, dy).normalize();
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private faceTarget(target: Vec2, maxStep: number = 0.19634375): void {
        const pos = this.entity.positionRef;
        const dx = target.x - pos.x;
        const dy = target.y - pos.y;
        this.entity.setClampYaw(Math.atan2(dy, dx), maxStep);
    }

    private simpleMove() {
        const speedMultiplier = this.entity.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier <= 0) return;

        const speed = this.entity.getMovementSpeed() * speedMultiplier;
        const vx = Math.sin(this.entity.age * 0.1) * 0.8 * speedMultiplier;

        this.entity.updateVelocity(speed, vx, this.entity.verticalMovementDir);
    }
}