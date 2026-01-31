import {type Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {PI2, rand} from "../../utils/math/math.ts";
import {RocketEntity} from "./RocketEntity.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {BallisticsUtils} from "../../utils/math/BallisticsUtils.ts";
import {MissileLockS2CPacket} from "../../network/packet/s2c/MissileLockS2CPacket.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {type NbtCompound} from "../../nbt/NbtCompound.ts";

export class MissileEntity extends RocketEntity {
    public static readonly lockedEntity = new WeakMap<Entity, number>();

    protected target: Entity | null = null;
    protected lastTarget: Entity | null = null;

    protected reLockCD = 0;
    protected maxReLockCD = 5;

    protected igniteDelayTicks = 16;
    protected lockDelayTicks = 40;
    protected maxLifetimeTicks = 400;

    protected driftAttenuation = true;
    protected driftSpeed = 2;
    protected trackingSpeed = 3;

    protected turnRate = Math.PI / 20;

    public hoverDir: number = 1;
    public driftAngle: number;

    public constructor(type: EntityType<MissileEntity>, world: World, owner: Entity, driftAngle: number, damage = 5) {
        super(type, world, owner, damage);
        this.driftAngle = driftAngle;
    }

    public override tick() {
        this.prevYaw = this.getYaw();

        const pos = this.getPositionRef;
        this.moveByVec(this.getVelocityRef);

        if (!this.adjustPosition()) return;

        const world = this.getWorld();

        if (!world.isClient && this.lastTarget !== this.target) {
            const packet = new MissileLockS2CPacket(this.getId(), this.target?.getId() ?? 0);
            world.getNetworkChannel().send(packet);
        }

        // 燃料耗尽
        if (this.age > this.maxLifetimeTicks) {
            if (this.target) {
                world.events.emit(EVENTS.ENTITY_UNLOCKED, {missile: this, lastTarget: this.target});
            }
            this.target = null;
            this.lastTarget = null;
            return;
        }

        // 点燃延迟
        if (this.age <= this.igniteDelayTicks) {
            if (this.driftSpeed > 0.01 && this.driftAttenuation) this.driftSpeed *= 0.98;
            if (world.isClient) return;

            const vx1 = Math.cos(this.driftAngle);
            const vy1 = Math.sin(this.driftAngle);
            this.updateVelocity(this.driftSpeed, vx1, vy1);

            this.getVelocityRef.multiply(0.8);
            this.velocityDirty = true;
            return;
        }

        const cd = (this.age & 3) === 0;

        if (world.isClient) {
            if (!cd) return;

            const yaw = this.getYaw();
            const dx = Math.cos(yaw) * 32;
            const dy = Math.sin(yaw) * 32;
            world.addParticle(
                pos.x - dx, pos.y - dy,
                rand(-1, 1), rand(-1, 1),
                rand(1, 1.5), rand(4, 6),
                "#986900", "#575757", 0.3
            );
            return;
        }

        this.getVelocityRef.multiply(0.8);
        this.velocityDirty = true;

        // 开始锁定
        if (this.age < this.lockDelayTicks) {
            const yaw = this.getYaw();
            this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
            return;
        }

        // 干扰逻辑
        if (this.shouldApplyDecoy()) {
            this.applyDecoy();
        }

        // 重新锁定
        if (this.reLockCD > 0) this.reLockCD--;
        if (!this.target || this.target.isRemoved()) {
            let target: Entity | null = null;

            if (cd && this.reLockCD <= 0) {
                target = this.acquireTarget();
            }

            if (!target) {
                const yaw = this.getYaw();
                this.setYaw(yaw + this.turnRate * this.hoverDir);
                this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
                return;
            }

            this.lastTarget = this.target;
            this.target = target;
            this.reLockCD = this.maxReLockCD;

            const count = MissileEntity.lockedEntity.get(this.target) ?? 0;
            MissileEntity.lockedEntity.set(this.target, count + 1);

            world.events.emit(EVENTS.ENTITY_LOCKED, {missile: this});
        }

        // 追踪
        const targetPos = this.target.getPositionRef;
        const targetVel = this.target.getVelocityRef;
        const desiredYaw = this.predictMethod(pos, targetPos, targetVel);

        this.setClampYaw(desiredYaw, this.turnRate);

        const yaw = this.getYaw();
        this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
    }

    protected predictMethod(pos: MutVec2, targetPos: MutVec2, targetVel: IVec) {
        return BallisticsUtils.guidedIntercept(
            pos,
            targetPos,
            targetVel,
            this.trackingSpeed,
            this.turnRate,
            WorldConfig.mbps
        );
    }

    public shouldApplyDecoy(): boolean {
        return false;
    }

    public applyDecoy(): void {
    }

    public override onDiscard() {
        super.onDiscard();

        if (this.target) {
            const count = MissileEntity.lockedEntity.get(this.target) ?? 0;
            if (count > 1) {
                MissileEntity.lockedEntity.set(this.target, count - 1);
            } else {
                MissileEntity.lockedEntity.delete(this.target);
            }
        }

        this.getWorld().events.emit(EVENTS.ENTITY_UNLOCKED, {missile: this, lastTarget: this.target});
        this.target = null;
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

    public getTarget(): Entity | null {
        return this.target;
    }

    public setTarget(target: Entity | null): void {
        this.target = target;
    }

    public getLastTarget(): Entity | null {
        return this.lastTarget;
    }

    protected acquireTarget(): Entity | null {
        const world = this.getWorld();

        const mobs = world.getMobs();
        if (mobs.size === 0) return null;

        const pos = this.getPositionRef;
        const yaw = this.getYaw();
        let best: Entity | null = null;
        let bestScore = -Infinity;

        for (const mob of mobs) {
            if (mob.isRemoved() || mob === this.getOwner()) continue;

            const currentLocks = MissileEntity.lockedEntity.get(mob) ?? 0;
            const totalDamage = this.getHitDamage() + this.explosionDamage;

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

    protected override adjustPosition(): boolean {
        const pos = this.getPositionRef;
        if (pos.y < -400 || pos.y > World.WORLD_H + 400 || pos.x < -400 || pos.x > World.WORLD_W + 400) {
            this.discard();
            return false;
        }
        return true;
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        nbt.putUint('Age', this.age);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.age = nbt.getUint('Age', 0);
    }
}