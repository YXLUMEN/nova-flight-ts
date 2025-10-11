import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerFireC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerFireC2SPacket> = {id: Identifier.ofVanilla('player_fire')};

    public static readonly CODEC: PacketCodec<PlayerFireC2SPacket> = PacketCodecs.of<PlayerFireC2SPacket>(
        (value, writer) => {
            writer.writeString(value.uuid);
            writer.writeByte(value.start ? 1 : 0)
        },
        (reader) => {
            return new PlayerFireC2SPacket(reader.readString() as UUID, reader.readByte() === 1);
        }
    );

    public readonly uuid: UUID;
    public readonly start: boolean;

    public constructor(uuid: UUID, start: boolean) {
        this.uuid = uuid;
        this.start = start;
    }

    public getId(): PayloadId<PlayerFireC2SPacket> {
        return PlayerFireC2SPacket.ID;
    }
}