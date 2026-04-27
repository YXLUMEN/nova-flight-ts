import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class MissileLockS2CPacket implements Payload {
    public static readonly ID: PayloadId<MissileLockS2CPacket> = payloadId('missile_lock');
    public static readonly CODEC: PacketCodec<MissileLockS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.VAR_UINT,
        val => val.lockEntityId,
        MissileLockS2CPacket.new
    );

    public readonly entityId: number;
    public readonly lockEntityId: number;

    public constructor(id: number, lockEntityId: number) {
        this.entityId = id;
        this.lockEntityId = lockEntityId;
    }

    public static new(id: number, lockEntityId: number) {
        return new MissileLockS2CPacket(id, lockEntityId);
    }

    public getId(): PayloadId<MissileLockS2CPacket> {
        return MissileLockS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onMissileLock(this);
    }
}