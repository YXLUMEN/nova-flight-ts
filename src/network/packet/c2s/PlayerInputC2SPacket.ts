import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerInputC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerInputC2SPacket> = {id: Identifier.ofVanilla('player_input')};

    public static readonly CODEC: PacketCodec<PlayerInputC2SPacket> = PacketCodecs.of<PlayerInputC2SPacket>(
        (writer, value) => {
            writer.writeString(value.uuid);
            writer.writeString(value.key);
        },
        (reader) => {
            return new PlayerInputC2SPacket(reader.readString() as UUID, reader.readString());
        }
    );

    public readonly uuid: UUID;
    public readonly key: string;

    public constructor(uuid: UUID, key: string) {
        this.uuid = uuid;
        this.key = key;
    }

    public getId(): PayloadId<PlayerInputC2SPacket> {
        return PlayerInputC2SPacket.ID;
    }
}