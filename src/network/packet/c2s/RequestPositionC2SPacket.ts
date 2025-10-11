import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class RequestPositionC2SPacket implements Payload {
    public static readonly ID: PayloadId<RequestPositionC2SPacket> = {id: Identifier.ofVanilla('request_position')};

    public static readonly CODEC: PacketCodec<RequestPositionC2SPacket> = PacketCodecs.of<RequestPositionC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.playerId);
        },
        (reader) => {
            return new RequestPositionC2SPacket(reader.readUUID());
        }
    );

    public readonly playerId: UUID;

    public constructor(playerId: UUID) {
        this.playerId = playerId;
    }

    public getId(): PayloadId<RequestPositionC2SPacket> {
        return RequestPositionC2SPacket.ID;
    }
}