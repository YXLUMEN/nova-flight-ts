import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class PlayerProfileSyncS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerProfileSyncS2CPacket> = payloadId('profile_sync');
    public static readonly CODEC: PacketCodec<PlayerProfileSyncS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.BOOL,
        val => val.devMode,
        val => new PlayerProfileSyncS2CPacket(val)
    );

    public readonly devMode: boolean;

    public constructor(devMode: boolean) {
        this.devMode = devMode;
    }

    public getId(): PayloadId<PlayerProfileSyncS2CPacket> {
        return PlayerProfileSyncS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onSyncProfile(this);
    }
}