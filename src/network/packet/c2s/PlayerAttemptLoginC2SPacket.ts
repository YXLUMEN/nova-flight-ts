import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerAttemptLoginC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerAttemptLoginC2SPacket> = {id: Identifier.ofVanilla('player_login')};

    public static readonly CODEC: PacketCodec<PlayerAttemptLoginC2SPacket> = PacketCodecs.of<PlayerAttemptLoginC2SPacket>(
        (value, writer) => {
            writer.writeUUID(value.clientId);
        },
        (reader) => {
            return new PlayerAttemptLoginC2SPacket(reader.readUUID());
        }
    );

    public readonly clientId: UUID;

    public constructor(clientId: UUID) {
        this.clientId = clientId;
    }

    public getId(): PayloadId<PlayerAttemptLoginC2SPacket> {
        return PlayerAttemptLoginC2SPacket.ID;
    }
}