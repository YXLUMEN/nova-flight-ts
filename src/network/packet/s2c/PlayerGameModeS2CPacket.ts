import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerGameModeS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerGameModeS2CPacket> = payloadId('profile_sync');
    public static readonly CODEC: PacketCodec<PlayerGameModeS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.BOOL,
        val => val.devMode,
        val => new PlayerGameModeS2CPacket(val)
    );

    public readonly devMode: boolean;

    public constructor(devMode: boolean) {
        this.devMode = devMode;
    }

    public getId(): PayloadId<PlayerGameModeS2CPacket> {
        return PlayerGameModeS2CPacket.ID;
    }
}