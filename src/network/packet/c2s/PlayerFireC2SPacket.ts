import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerFireC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerFireC2SPacket> = {id: Identifier.ofVanilla('player_fire')};

    public static readonly CODEC: PacketCodec<PlayerFireC2SPacket> = PacketCodecs.of<PlayerFireC2SPacket>(
        (writer, value) => {
            writer.writeByte(value.start ? 1 : 0)
        },
        (reader) => {
            return new PlayerFireC2SPacket(reader.readByte() === 1);
        }
    );

    public readonly start: boolean;

    public constructor(start: boolean) {
        this.start = start;
    }

    public getId(): PayloadId<PlayerFireC2SPacket> {
        return PlayerFireC2SPacket.ID;
    }
}