import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class SyncPlayerProfileS2CPacket implements Payload {
    public static readonly ID: PayloadId<SyncPlayerProfileS2CPacket> = {id: Identifier.ofVanilla('profile_sync')};

    public static readonly CODEC: PacketCodec<SyncPlayerProfileS2CPacket> = PacketCodecs.of<SyncPlayerProfileS2CPacket>(
        (writer, value) => {
            writer.writeByte(value.devMode ? 1 : 0)
        },
        (reader) => {
            return new SyncPlayerProfileS2CPacket(reader.readByte() !== 0);
        }
    );

    public readonly devMode: boolean;

    public constructor(devMode: boolean) {
        this.devMode = devMode;
    }

    public getId(): PayloadId<SyncPlayerProfileS2CPacket> {
        return SyncPlayerProfileS2CPacket.ID;
    }
}