import type {MobEntity} from "../mob/MobEntity.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import type {EntityAi} from "./EntityAi.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Entity} from "../Entity.ts";
import {getNearestEntityByVec} from "../../utils/math/collide.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {SimpleRandom} from "../../utils/math/random/SimpleRandom.ts";
import {EntityPredicates} from "../../world/predicate/EntityPredicates.ts";

export const enum AiBehavior {
    Idle,
    Wander,
    Chase,
    Flee,
    Simple
}

export class MobAI implements EntityAi {
    private disable = false;

    private readonly entity: MobEntity;
    private readonly dir = new MutVec2(1, 0);
    private readonly random: SimpleRandom;

    private readonly targetPos = MutVec2.zero();
    private target: Entity | null = null;
    private targetYaw: number = 0;

    private wanderDirTimer = 0;
    private idleYawTimer = 0;
    private behavior: number = AiBehavior.Simple;

    public constructor(entity: MobEntity) {
        this.entity = entity;
        this.random = new SimpleRandom(entity.getId());
    }

    public tick(): void {
        if (this.disable) return;

        const speedMultiplier = this.entity.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        if (speedMultiplier === 0) return;
        const speed = this.entity.getMovementSpeed() * speedMultiplier;
        const pos = this.target?.positionRef ?? this.targetPos;

        switch (this.behavior) {
            case AiBehavior.Idle:
                this.idle(speed * 0.5);
                break;
            case AiBehavior.Wander:
                this.wander(speed);
                this.faceTarget(pos);
                break;
            case AiBehavior.Chase:
                this.moveToward(speed);
                this.faceTarget(pos);
                break;
            case AiBehavior.Flee:
                this.moveAway(pos, speed);
                this.faceTarget(pos);
                break;
            case AiBehavior.Simple:
                this.simpleMove();
                break;
        }
    }

    public decision() {
        if (this.disable) return;

        if (this.behavior !== AiBehavior.Simple && (this.entity.age & 31) === 0) {
            this.chooseTarget();
        }
    }

    private chooseTarget() {
        if (isClient) return;

        const pos = this.entity.positionRef;
        const players = this.entity.getWorld().getPlayers();
        const target = getNearestEntityByVec(pos, players, EntityPredicates.CAN_DAMAGE);
        this.target = target;

        if (!target) {
            this.setBehavior(AiBehavior.Idle);
            return;
        }

        const targetPos = target.positionRef;
        const distSq = pos.distSqTo(targetPos);
        this.targetPos.set(targetPos.x, targetPos.y);

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

    public setDisabled(value: boolean): void {
        if (!value) this.target = null;
        this.disable = value;
    }

    public setBehavior(behavior: number): void {
        this.behavior = behavior;
    }

    public isSimple() {
        return this.behavior === AiBehavior.Simple;
    }

    private idle(speed: number): void {
        if (this.idleYawTimer-- <= 0) {
            this.idleYawTimer = this.random.nextInt(35, 50);
            this.targetYaw += this.random.nextFloat();
        }

        this.entity.setClampYaw(this.targetYaw);
        const yaw = this.entity.getYaw();
        this.entity.updateVelocity(speed, Math.cos(yaw), Math.sin(yaw));
    }

    private wander(speed: number): void {
        if (this.wanderDirTimer-- <= 0) {
            this.dir.set(this.random.nextFloat() - 0.5, this.random.nextFloat() - 0.5);
            this.wanderDirTimer = 50;
        }
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
    }

    private moveToward(speed: number): void {
        if (speed <= 0) return;
        const yaw = this.entity.getYaw();
        this.dir.set(Math.cos(yaw), Math.sin(yaw));
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
        this.entity.needSync = true;
    }

    private moveAway(target: Vec2, speed: number): void {
        if (speed <= 0) return;
        const pos = this.entity.positionRef;
        const dx = pos.x - target.x;
        const dy = pos.y - target.y;
        this.dir.set(dx, dy).normalize();
        this.entity.updateVelocity(speed, this.dir.x, this.dir.y);
        this.entity.needSync = true;
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

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.setInt8('ai_behavior', this.behavior);
        return nbt;
    }

    public readNBT(nbt: NbtCompound): void {
        this.setBehavior(nbt.getInt8('ai_behavior', AiBehavior.Simple));
    }
}