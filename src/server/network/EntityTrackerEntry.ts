import type {ServerWorld} from "../ServerWorld.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {Payload} from "../../network/Payload.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {VecDeltaCodec} from "../../entity/VecDeltaCodec.ts";
import {encodeYaw} from "../../utils/NetUtil.ts";
import {MoveRelative, Rotate, RotateAndMoveRelative} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";

export class EntityTrackerEntry {
    private readonly world: ServerWorld;
    private readonly entity: Entity;
    private readonly tickInterval: number;
    private readonly trackDelta: boolean;
    private readonly posDelta = new VecDeltaCodec();
    private readonly velocity: MutVec2;

    private lastYawUint8: number;

    private trackingTick: number = 0;
    private updates: number = 0;

    public constructor(world: ServerWorld, entity: Entity, tickInterval: number, trackDelta: boolean) {
        this.world = world;
        this.entity = entity;
        this.tickInterval = tickInterval;
        this.trackDelta = trackDelta;
        this.posDelta.setPos(entity.positionRef.x, entity.positionRef.y);
        this.velocity = entity.velocityRef.clone();
        this.lastYawUint8 = encodeYaw(entity.getYaw());
    }

    public tick() {
        if (this.trackingTick % this.tickInterval === 0 || this.entity.needSync || this.entity.getDataTracker().isDirty()) {
            this.updates++;

            const yawUint8 = encodeYaw(this.entity.getYaw());
            const entityPos = this.entity.getPosition();
            const lenDelta = this.posDelta.subtract(entityPos).lengthSquared() >= 7.6293945E-6;

            let packet: Payload | null = null;
            let relativePos = lenDelta || this.trackingTick % 60 === 0;
            let yawDelta = Math.abs(yawUint8 - this.lastYawUint8) >= 1;
            let syncPos = false;
            let syncYaw = false;

            // 同步位置
            const dx = this.posDelta.getDeltaX(entityPos);
            const dy = this.posDelta.getDeltaY(entityPos);
            const posDelta = dx < -32768 || dx > 32768 || dy < -32768 || dy > 32768;
            if (posDelta || this.updates > 400) {
                this.updates = 0;
                packet = EntityPositionS2CPacket.create(this.entity);
                syncPos = true;
                syncYaw = true;
            } else if (!relativePos || !yawDelta) {
                if (relativePos) {
                    packet = new MoveRelative(this.entity.getId(), dx, dy);
                    syncPos = true;
                } else if (yawDelta) {
                    packet = new Rotate(this.entity.getId(), yawUint8);
                    syncYaw = true;
                }
            } else {
                packet = new RotateAndMoveRelative(this.entity.getId(), dx, dy, yawUint8);
                syncPos = true;
                syncYaw = true;
            }

            if (this.entity.needSync || this.trackDelta) {
                const velocity = this.entity.velocityRef;
                const delta = squareDistVec2(velocity, this.velocity);

                if (delta > 1E-7 || delta > 0 && velocity.lengthSquared() === 0) {
                    this.velocity.set(velocity.x, velocity.y);
                    this.sendSync(EntityVelocityUpdateS2CPacket.createWithVec(this.entity, this.velocity));
                }
            }

            if (packet !== null) {
                this.sendSync(packet);
            }

            this.syncEntityData();
            if (syncPos) {
                this.posDelta.setPos(entityPos.x, entityPos.y);
            }

            if (syncYaw) {
                this.lastYawUint8 = yawUint8;
            }

            this.entity.needSync = false;
        }

        this.trackingTick++;
        if (this.entity.velocityModified) {
            this.entity.velocityModified = false;
            this.sendSync(EntityVelocityUpdateS2CPacket.create(this.entity));
        }
    }

    private syncEntityData() {
        const tracker = this.entity.getDataTracker();
        const list = tracker.getDirtyEntries();
        if (list !== null) {
            this.sendSync(new EntityTrackerUpdateS2CPacket(this.entity.getId(), list));
        }

        if (this.entity instanceof LivingEntity) {
            const pending = this.entity.getAttributes().getPendingSync();
            if (pending.size === 0) return;

            const packet = EntityAttributesS2CPacket.create(this.entity.getId(), pending);
            if (packet.entries.length > 0) this.sendSync(packet);
            pending.clear();
        }
    }

    private sendSync(packet: Payload) {
        this.world.getNetworkChannel().send(packet);
    }
}