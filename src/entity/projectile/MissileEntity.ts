import {type Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {rand} from "../../utils/math/math.ts";
import {RocketEntity} from "./RocketEntity.ts";
import {BallisticsUtils} from "../../utils/math/BallisticsUtils.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {type NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {ProjectRaycastUtil} from "../../world/collision/ProjectRaycastUtil.ts";
import {HitType} from "../../world/collision/HitResult.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import {DataTracker} from "../data/DataTracker.ts";
import {TrackedDataHandlerRegistry} from "../data/TrackedDataHandlerRegistry.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {TrackedData} from "../data/TrackedData.ts";
import type {ClientPlayerEntity} from "../../client/entity/ClientPlayerEntity.ts";
import {PlayerMissileTargetSelector} from "../../utils/math/MissileTargetSelector.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import {MissileLockEntity} from "../../event/events/MissileLockEntity.ts";

export class MissileEntity extends RocketEntity {
    public static readonly IS_IGNITE = DataTracker.registerData(Object(MissileEntity), TrackedDataHandlerRegistry.BOOL);
    public static readonly TARGET_ID = DataTracker.registerData(Object(MissileEntity), TrackedDataHandlerRegistry.VAR_UINT);

    protected target: Entity | null = null;
    protected lastTarget: Entity | null = null;

    protected relockCooldown = 0;
    protected maxRelockCooldown = 5;

    protected igniteDelayTicks = 16;
    protected lockDelayTicks = 40;
    protected maxLifetimeTicks = 400;
    private ignite = false;
    private ignited = false;

    protected driftAttenuation = true;
    protected driftSpeed = 2;
    protected trackingSpeed = 3;

    protected turnRate = Math.PI / 20;

    public hoverDir: number = 1;
    private driftAngle: number;

    public constructor(type: EntityType<MissileEntity>, world: World, owner: Entity, driftAngle: number, damage = 5) {
        super(type, world, owner, damage);
        this.driftAngle = driftAngle;
    }

    protected override defineSyncedData(builder: InstanceType<typeof DataTracker.Builder>) {
        super.defineSyncedData(builder);
        builder.define(MissileEntity.IS_IGNITE, false);
        builder.define(MissileEntity.TARGET_ID, 0);
    }

    public override tick() {
        if (this.clampPosition()) return;

        this.prevYaw = this.getYaw();
        this.track(this.velocityRef);

        const world = this.getWorld();
        if (!world.isClient && this.lastTarget !== this.target) {
            this.lastTarget = this.target;
            this.setTarget(this.target);
        }

        // 燃料耗尽
        if (this.age > this.maxLifetimeTicks) {
            this.onFuelExhausted();
            return;
        }

        // 点燃延迟
        if (this.age <= this.igniteDelayTicks) {
            this.tickDrift(world);
            return;
        }

        this.emitClientParticles(world);
        if (world.isClient) return;

        this.ensureIgnited();

        if (this.age < this.lockDelayTicks) {
            this.tickLock();
            return;
        }
        this.tickTracking(world);
    }

    private tickDrift(world: World): void {
        if (this.driftSpeed > 0.01 && this.driftAttenuation) {
            this.driftSpeed *= 0.98;
        }
        if (world.isClient) return;

        const vx1 = Math.cos(this.driftAngle);
        const vy1 = Math.sin(this.driftAngle);
        this.updateVelocity(this.driftSpeed, vx1, vy1);
        this.velocityRef.multiply(0.8);
        this.needSync = true;
    }

    private tickLock(): void {
        const yaw = this.getYaw();
        this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
        this.velocityRef.multiply(0.8);
        this.needSync = true;
    }

    private tickTracking(world: World): void {
        this.applyDecoy();
        this.maintainTargetLock(world);

        if (this.target === null || this.target.isRemoved()) {
            this.hoverWithoutTarget();
            return;
        }
        this.applyGuidance();
    }

    private maintainTargetLock(world: World): void {
        if (this.relockCooldown > 0) this.relockCooldown--;
        if (this.target !== null && !this.target.isRemoved()) return;
        if ((this.age & 3) !== 0 || this.relockCooldown > 0) return;

        const newTarget = this.acquireTarget();
        if (newTarget === null) return;
        this.target = newTarget;
        this.relockCooldown = this.maxRelockCooldown;

        world.events.emit(new MissileLockEntity(this));
    }

    private applyGuidance(): void {
        const target = this.target!;
        const desiredYaw = this.predictInterceptYaw(this.positionRef, target.positionRef, target.velocityRef);

        this.setClampYaw(desiredYaw, this.turnRate);
        const yaw = this.getYaw();
        this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
        this.velocityRef.multiply(0.8);
        this.needSync = true;
    }

    private hoverWithoutTarget(): void {
        const yaw = this.getYaw();
        this.setYaw(yaw + this.turnRate * this.hoverDir);
        this.updateVelocity(this.trackingSpeed, Math.cos(yaw), Math.sin(yaw));
        this.velocityRef.multiply(0.8);
        this.needSync = true;
    }

    private emitClientParticles(world: World): void {
        if (!world.isClient || !this.isIgnite()) return;

        if (!this.ignited) {
            this.ignited = true;
            world.addPreparedParticleVec(
                ParticleEffects.BURST,
                this.positionRef,
                8,
                this.getYaw() + Math.PI
            );
        }

        if ((this.age & 3) !== 0) return;

        const pos = this.positionRef;
        const yaw = this.getYaw();
        world.addParticle(
            pos.x - Math.cos(yaw) * 32,
            pos.y - Math.sin(yaw) * 32,
            rand(-1, 1), rand(-1, 1),
            rand(1, 1.5), rand(4, 6),
            "#986900", "#575757",
            0,
            0.3,
        );
    }

    private ensureIgnited(): void {
        if (this.ignite) return;
        this.ignite = true;
        this.dataTracker.set(MissileEntity.IS_IGNITE, true);
    }

    private onFuelExhausted(): void {
        this.target = null;
        if (!this.ignite) return;
        this.ignite = false;
        this.dataTracker.set(MissileEntity.IS_IGNITE, false);
    }

    protected predictInterceptYaw(pos: MutVec2, targetPos: MutVec2, targetVel: Vec2): number {
        return BallisticsUtils.guidedIntercept(
            pos,
            targetPos,
            targetVel,
            this.trackingSpeed,
            this.turnRate,
            0.02
        );
    }

    protected track(movement: Vec2) {
        const pos = this.positionRef;
        const hitResult = ProjectRaycastUtil.getCollision(this, entity => this.canHit(entity));
        if (hitResult.getType() !== HitType.MISS) {
            this.onCollision(hitResult);
        }

        this.setPosition(pos.x + movement.x, pos.y + movement.y);
    }

    public applyDecoy(): void {
    }

    public override onDiscard(): void {
        super.onDiscard();

        this.target = null;
        this.lastTarget = null;
    }

    public isIgnite(): boolean {
        return this.dataTracker.get(MissileEntity.IS_IGNITE);
    }

    public getTarget(): Entity | null {
        return this.target;
    }

    public setTarget(target: Entity | null): void {
        this.target = target;
        if (this.isClient()) return;
        this.dataTracker.set(MissileEntity.TARGET_ID, target?.getId() ?? 0);
    }

    protected acquireTarget(): Entity | null {
        return PlayerMissileTargetSelector.acquireTarget(
            this.getWorld(),
            this.positionRef,
            this.getYaw(),
            this.getOwner()
        );
    }

    public override onTrackedDataSet(data: TrackedData<any>) {
        super.onTrackedDataSet(data);
        if (data !== MissileEntity.TARGET_ID) return;

        const world = this.getWorld();
        if (!world.isClient) return;

        const id = this.dataTracker.get(MissileEntity.TARGET_ID);
        this.target = world.getEntityById(id);
        if (this.target && this.target.isPlayer()) {
            (this.target as ClientPlayerEntity).lockedMissile.add(this);
        }
    }

    public override createSpawnPacket(): EntitySpawnS2CPacket {
        const ownerId = this.getOwner()?.getId() ?? 0;
        const writer = new BinaryWriter(5);
        writer.writeFloat(this.driftAngle);
        writer.writeInt8(this.hoverDir);
        return EntitySpawnS2CPacket.create(this, ownerId, writer.toUint8Array());
    }

    public override onSpawnPacket(packet: EntitySpawnS2CPacket) {
        super.onSpawnPacket(packet);
        if (packet.extraData) {
            const reader = new BinaryReader(packet.extraData);
            this.driftAngle = reader.readFloat();
            this.hoverDir = reader.readInt8();
        }
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);
        nbt.setUint32('age', this.age);
        return nbt;
    }

    public override readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);
        this.age = nbt.getUint32('age', 0);
    }
}