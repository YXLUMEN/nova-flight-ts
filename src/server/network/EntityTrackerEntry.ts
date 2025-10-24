import type {ServerWorld} from "../ServerWorld.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {Payload} from "../../network/Payload.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import type {DataTrackerSerializedEntry} from "../../entity/data/DataTracker.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {distanceVec2} from "../../utils/math/math.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {TrackedPosition} from "../../entity/TrackedPosition.ts";
import {encodeYaw} from "../../utils/NetUtil.ts";
import {MoveRelative, Rotate, RotateAndMoveRelative} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";

export class EntityTrackerEntry {
    private readonly world: ServerWorld;
    private readonly entity: Entity;
    private readonly tickInterval: number;
    private readonly alwaysUpdateVelocity: boolean;
    private readonly trackedPos = new TrackedPosition();
    private lastYaw: number;
    private velocity: MutVec2;
    private trackingTick: number = 0;
    private updates: number = 0;
    // @ts-ignore
    private changedEntries: DataTrackerSerializedEntry<any>[] | null;

    public constructor(world: ServerWorld, entity: Entity, tickInterval: number, alwaysUpdateVelocity: boolean) {
        this.world = world;
        this.entity = entity;
        this.tickInterval = tickInterval;
        this.alwaysUpdateVelocity = alwaysUpdateVelocity;
        this.trackedPos.setPos(entity.getPositionRef.x, entity.getPositionRef.y);
        this.velocity = entity.getVelocityRef.clone();
        this.lastYaw = encodeYaw(entity.getYaw());
        this.changedEntries = entity.getDataTracker().getChangedEntries();
    }

    public tick() {
        if (this.trackingTick % this.tickInterval === 0 || this.entity.velocityDirty || this.entity.getDataTracker().isDirty()) {
            this.updates++;

            const byteYaw = encodeYaw(this.entity.getYaw());
            const entityPos = this.entity.getPosition();
            const lenDelta = this.trackedPos.subtract(entityPos).lengthSquared() >= 7.6293945E-6;

            let packet: Payload | null = null;
            let relativePos = lenDelta || this.trackingTick % 60 === 0;
            let yawDelta = Math.abs(byteYaw - this.lastYaw) >= 1;
            let syncPos = false;
            let syncYaw = false;

            // 同步位置
            const dx = this.trackedPos.getDeltaX(entityPos);
            const dy = this.trackedPos.getDeltaY(entityPos);
            const posDelta = dx < -32768 || dx > 32768 || dy < -32768 || dy > 32768;
            if (posDelta || this.updates > 400) {
                this.updates = 0;
                packet = EntityPositionS2CPacket.create(this.entity);
                syncPos = true;
                syncYaw = true;
            } else if (relativePos) {
                packet = new MoveRelative(this.entity.getId(), dx, dy);
                syncPos = true;
            } else if (yawDelta) {
                packet = new Rotate(this.entity.getId(), byteYaw);
                syncYaw = true;
            } else {
                const smallPos = Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
                const smallYaw = Math.abs(byteYaw - this.lastYaw) <= 2;
                if (!smallPos || !smallYaw) {
                    packet = new RotateAndMoveRelative(this.entity.getId(), dx, dy, byteYaw);
                    syncPos = true;
                    syncYaw = true;
                }
            }

            if (this.alwaysUpdateVelocity || this.entity.velocityDirty) {
                const velocity = this.entity.getVelocityRef;
                const delta = distanceVec2(velocity, this.velocity);

                if (delta > 1E-7 || delta > 0 && velocity.lengthSquared() === 0) {
                    this.velocity = velocity;
                    this.sendSync(EntityVelocityUpdateS2CPacket.create(this.entity));
                }
            }

            if (packet !== null) {
                this.sendSync(packet);
            }

            this.syncEntityData();
            if (syncPos) {
                this.trackedPos.setPos(entityPos.x, entityPos.y);
            }

            if (syncYaw) {
                this.lastYaw = byteYaw;
            }

            this.entity.velocityDirty = false;
        }

        this.trackingTick++;
    }

    private syncEntityData() {
        const tracker = this.entity.getDataTracker();
        const list = tracker.getDirtyEntries();
        if (list !== null) {
            this.changedEntries = tracker.getChangedEntries();
            this.sendSync(new EntityTrackerUpdateS2CPacket(this.entity.getId(), list));
        }

        if (this.entity instanceof LivingEntity) {
            const pending = this.entity.getAttributes().getPendingSync();
            if (pending.size <= 0) return;

            const packet = EntityAttributesS2CPacket.create(this.entity.getId(), pending);
            if (packet.entries.length > 0) this.sendSync(packet);
            pending.clear();
        }
    }

    private sendSync(packet: Payload) {
        this.world.getNetworkChannel().send(packet);
    }
}