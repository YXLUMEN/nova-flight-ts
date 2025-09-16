import {type Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PI2, rand} from "../../utils/math/math.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {AutoAim} from "../../tech/AutoAim.ts";
import {RocketEntity} from "./RocketEntity.ts";

export class MissileEntity extends RocketEntity {
    public static lockedEntity = new WeakMap<Entity, number>();

    private target: Entity | null = null;

    private igniteDelayTicks = 80;
    private lockDelayTicks = 150;
    private maxLifetimeTicks = 1000;

    private driftSpeed = 0.8;
    private trackingSpeed = 1.6;
    private readonly turnRate = Math.PI / 60;
    private hoverDir: number = 1;

    private readonly driftAngle: number;
    private readonly lockeType: string;

    public constructor(type: EntityType<MissileEntity>, world: World, owner: Entity, driftAngle: number, lockType = 'mobs', damage = 5) {
        super(type, world, owner, damage);
        this.driftAngle = driftAngle;
        this.lockeType = lockType;
    }

    public override tick() {
        this.age++;

        const pos = this.getPositionRef;
        this.moveByVec(this.getVelocityRef);
        this.getVelocityRef.multiply(0.8);

        if (!this.adjustPosition()) return;

        if (this.age > this.maxLifetimeTicks) {
            const yaw = this.getYaw();
            this.setYaw(yaw);
            this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
            return;
        }

        if (this.age <= this.igniteDelayTicks) {
            if (this.driftSpeed > 0.01) this.driftSpeed *= 0.98;
            const vx1 = Math.cos(this.driftAngle);
            const vy1 = Math.sin(this.driftAngle);
            this.updateVelocity(this.driftSpeed, vx1, vy1);
            return;
        }

        const cd = (this.age & 3) === 0;

        if (cd) this.getWorld().spawnParticleByVec(pos, Vec2.ZERO,
            rand(1, 1.5), rand(4, 6),
            "#986900", "#575757", 0.6, 80
        );

        if (this.age < this.lockDelayTicks) {
            const yaw = this.getYaw();
            this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
            return;
        }

        if (!this.target || this.target.isRemoved()) {
            if (cd) this.target = this.acquireTarget();
            if (!this.target) {
                const yaw = this.getYaw();
                this.setYaw(yaw + this.turnRate * this.hoverDir);
                this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
                return;
            }
            const count = MissileEntity.lockedEntity.get(this.target) ?? 0;
            MissileEntity.lockedEntity.set(this.target, count + 1);
        }

        // 追踪
        const targetPos = this.target.getPositionRef;
        const targetVel = this.target.getVelocityRef;
        const desiredYaw = AutoAim.getLeadYaw(pos, targetPos, targetVel, this.trackingSpeed);

        this.setClampYaw(desiredYaw, this.turnRate);

        const yaw2 = this.getYaw();
        this.updateVelocity(this.trackingSpeed, Math.cos(yaw2), Math.sin(yaw2));
    }

    private acquireTarget(): Entity | null {
        if (this.lockeType === 'player') {
            return this.getWorld().player;
        }

        const mobs = this.getWorld().getLoadMobs();
        if (mobs.size === 0) return null;

        const pos = this.getPositionRef;
        const yaw = this.getYaw();
        let best: Entity | null = null;
        let bestScore = -Infinity;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob === this.owner) continue;

            const currentLocks = MissileEntity.lockedEntity.get(mob) ?? 0;
            const totalDamage = this.damage + this.explosionDamage;

            if (currentLocks * totalDamage >= mob.getMaxHealth()) continue;

            const mobPos = mob.getPositionRef;
            const dx = mobPos.x - pos.x;
            const dy = mobPos.y - pos.y;
            const dist2 = dx * dx + dy * dy;

            // 正前方优先
            const yawToMob = Math.atan2(dy, dx);
            const yawDiff = Math.abs(((yawToMob - yaw + Math.PI) % PI2) - Math.PI);
            const facingScore = -yawDiff * 200;

            const totalScore = facingScore - dist2;
            if (totalScore > bestScore) {
                bestScore = totalScore;
                best = mob;
            }
        }
        return best;
    }

    public override discard(): void {
        super.discard();

        if (this.target) {
            const count = MissileEntity.lockedEntity.get(this.target) ?? 0;
            if (count > 1) {
                MissileEntity.lockedEntity.set(this.target, count - 1);
            } else {
                MissileEntity.lockedEntity.delete(this.target);
            }
            this.target = null;
        }
    }

    protected override adjustPosition(): boolean {
        const pos = this.getPositionRef;
        if (pos.y < -400 || pos.y > World.H + 400 || pos.x < -400 || pos.x > World.W + 400) {
            this.discard();
            return false;
        }
        return true;
    }

    public isIgnite(): boolean {
        return this.age > this.igniteDelayTicks && this.age <= this.maxLifetimeTicks;
    }

    public setLockedDelay(value: number): void {
        this.lockDelayTicks = value;
    }

    public setMaxLifeTick(value: number): void {
        this.maxLifetimeTicks = value;
    }

    public setDriftSpeed(value: number): void {
        this.driftSpeed = value;
    }

    public setTrackingSpeed(value: number): void {
        this.trackingSpeed = value;
    }

    public setHoverDir(value: 1 | -1) {
        this.hoverDir = value;
    }
}