import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerDisconnectC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerDisconnectC2SPacket> = {id: Identifier.ofVanilla('player_disconnect')};

    public static readonly CODEC: PacketCodec<PlayerDisconnectC2SPacket> = PacketCodecs.of<PlayerDisconnectC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.uuid);
        },
        (reader) => {
            return new PlayerDisconnectC2SPacket(reader.readUUID());
        }
    );

    public readonly uuid: UUID;

    public constructor(uuid: UUID) {
        this.uuid = uuid;
    }

    public getId(): PayloadId<PlayerDisconnectC2SPacket> {
        return PlayerDisconnectC2SPacket.ID;
    }
}