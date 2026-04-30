import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import type {ServerConfigHandler} from "../../../server/network/handler/ServerConfigHandler.ts";

export class ClientReadyC2SPacket implements Payload {
    public static readonly ID: PayloadId<ClientReadyC2SPacket> = payloadId('client_ready');
    public static readonly CODEC: PacketCodec<ClientReadyC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.UUID,
        val => val.clientId,
        to => new ClientReadyC2SPacket(to)
    );

    public readonly clientId: UUID;

    public constructor(uuid: UUID) {
        this.clientId = uuid;
    }

    public getId(): PayloadId<ClientReadyC2SPacket> {
        return ClientReadyC2SPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(listener: ServerConfigHandler): void {
        listener.onClientReady(this);
    }

    public estimateSize(): number {
        return 17;
    }
}