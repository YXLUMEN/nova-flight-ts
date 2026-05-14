import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerProfileSyncS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerProfileSyncS2CPacket> = payloadType('profile_sync');
    public static readonly CODEC: PacketCodec<PlayerProfileSyncS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.BOOL,
        val => val.devMode,
        val => new PlayerProfileSyncS2CPacket(val)
    );

    public readonly devMode: boolean;

    public constructor(devMode: boolean) {
        this.devMode = devMode;
    }

    public type(): PayloadType<PlayerProfileSyncS2CPacket> {
        return PlayerProfileSyncS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onSyncProfile(this);
    }
}