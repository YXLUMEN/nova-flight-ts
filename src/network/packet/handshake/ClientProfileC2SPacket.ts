import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {UUID} from "../../../type/types.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerHandshakeHandler} from "../../../server/network/handler/ServerHandshakeHandler.ts";

export class ClientProfileC2SPacket implements Payload {
    public static readonly ID: PayloadType<ClientProfileC2SPacket> = payloadType('player_attempt_login');
    public static readonly CODEC: PacketCodec<ClientProfileC2SPacket> = PacketCodecs.of<ClientProfileC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.clientId);
            writer.writeInt8(value.sessionId);
            writer.writeString(value.playerName);
        },
        (reader) => {
            return new ClientProfileC2SPacket(
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

    public type(): PayloadType<ClientProfileC2SPacket> {
        return ClientProfileC2SPacket.ID;
    }

    public accept(listener: ServerHandshakeHandler): void {
        listener.onClientProfile?.(this);
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public estimateSize(): number {
        return 17 + (this.playerName.length << 2);
    }
}