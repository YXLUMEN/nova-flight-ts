import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/types.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerAttemptLoginC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerAttemptLoginC2SPacket> = {id: Identifier.ofVanilla('player_attempt_login')};
    public static readonly CODEC: PacketCodec<PlayerAttemptLoginC2SPacket> = PacketCodecs.of<PlayerAttemptLoginC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.clientId);
            writer.writeInt8(value.sessionId);
            writer.writeString(value.playerName);
        },
        (reader) => {
            return new PlayerAttemptLoginC2SPacket(
                reader.readUUID(),
                reader.readUint8(),
                reader.readString()
            );
        }
    );

    public readonly clientId: UUID;
    public readonly sessionId: number;
    public readonly playerName: string;

    public constructor(clientId: UUID, sessionId: number, playerName: string) {
        this.clientId = clientId;
        this.sessionId = sessionId;
        this.playerName = playerName;
    }

    public getId(): PayloadId<PlayerAttemptLoginC2SPacket> {
        return PlayerAttemptLoginC2SPacket.ID;
    }
}