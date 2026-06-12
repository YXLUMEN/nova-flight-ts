import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";

export class ClientReadyC2SPacket implements Payload {
    public static readonly ID: PayloadType<ClientReadyC2SPacket> = payloadType('client_ready');
    public static readonly CODEC: PacketCodec<ClientReadyC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.UUID,
        val => val.clientId,
        to => new ClientReadyC2SPacket(to)
    );

    public readonly clientId: UUID;

    public constructor(uuid: UUID) {
        this.clientId = uuid;
    }

    public type(): PayloadType<ClientReadyC2SPacket> {
        return ClientReadyC2SPacket.ID;
    }

    public canProcessInTransition(): boolean {
        return true;
    }

    public accept(): void {
    }

    public estimateSize(): number {
        return 17;
    }
}