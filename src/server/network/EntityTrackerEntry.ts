import type {ServerWorld} from "../ServerWorld.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {Payload} from "../../network/Payload.ts";
import type {MutVec2} from "../../utils/math/MutVec2.ts";
import type {DataTrackerSerializedEntry} from "../../entity/data/DataTracker.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";

export class EntityTrackerEntry {
    private readonly world: ServerWorld;
    private readonly entity: Entity;
    private readonly tickInterval: number;
    private readonly alwaysUpdateVelocity: boolean;
    private readonly trackedPos: MutVec2;
    private lastYaw: number;
    private velocity: MutVec2;
    private trackingTick: number = 0;
    private updates: number = 0;
    private changedEntries: DataTrackerSerializedEntry<any>[] | null;

    public constructor(world: ServerWorld, entity: Entity, tickInterval: number, alwaysUpdateVelocity: boolean) {
        this.world = world;
        this.entity = entity;
        this.tickInterval = tickInterval;
        this.alwaysUpdateVelocity = alwaysUpdateVelocity;
        this.trackedPos = entity.getPositionRef.clone();
        this.velocity = entity.getVelocityRef.clone();
        this.lastYaw = entity.getYaw();
        this.changedEntries = entity.getDataTracker().getChangedEntries();
    }

    public tick() {
        if (this.tickInterval % this.tickInterval === 0 || this.entity.getDataTracker().isDirty()) {
            this.updates++;
            let packet: Payload | null = null;

            const pos = this.entity.getPositionRef;
            const dx = getDelta(pos.x, this.trackedPos.x);
            const dy = getDelta(pos.y, this.trackedPos.y);
            const posDelta = dx < -32768 || dx > 32768 || dy < -32768 || dy > 32768;
            if (posDelta || this.updates > 400) {
                this.updates = 0;
                packet = EntityPositionS2CPacket.create(this.entity);
            }

            if (packet) {
                this.world.getNetworkChannel().send(packet);
            }
        }
    }

    // private syncEntityData() {
    //     const tracker = this.entity.getDataTracker();
    //     const list = tracker.getDirtyEntries();
    //     if (list !== null) {
    //         this.changedEntries = tracker.getChangedEntries();
    //     }
    //
    //     if (this.entity instanceof LivingEntity) {
    //         const trackedSet = this.entity.getAttributes().getTracked();
    //         if (trackedSet.size > 0) {
    //         }
    //     }
    // }
}

function getDelta(a: number, b: number) {
    return Math.round(a * 4096) - Math.round(b * 4096);
}