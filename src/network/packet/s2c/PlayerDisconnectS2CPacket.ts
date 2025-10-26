import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";

export class PlayerDisconnectS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerDisconnectS2CPacket> = {id: Identifier.ofVanilla('player_disconnect')};
    public static readonly CODEC: PacketCodec<PlayerDisconnectS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeUUID(value.uuid);
            writer.writeString(value.reason);
        },
        reader => {
            return new PlayerDisconnectS2CPacket(
                reader.readUUID(),
                reader.readString()
            )
        }
    );

    public readonly uuid: UUID;
    public readonly reason: string;

    public constructor(uuid: UUID, reason: string = '') {
        this.uuid = uuid;
        this.reason = reason;
    }

    public getId(): PayloadId<PlayerDisconnectS2CPacket> {
        return PlayerDisconnectS2CPacket.ID;
    }
}