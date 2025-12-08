import {Identifier} from "../../../registry/Identifier.ts";
import type {Payload, PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";

export class ClientSniffingC2SPacket implements Payload {
    public static readonly ID: PayloadId<ClientSniffingC2SPacket> = {id: Identifier.ofVanilla('client_sniffing')};
    public static readonly CODEC: PacketCodec<ClientSniffingC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.UUID,
        val => val.clientId,
        to => new ClientSniffingC2SPacket(to)
    );

    public readonly clientId: UUID;

    public constructor(uuid: UUID) {
        this.clientId = uuid;
    }

    public getId(): PayloadId<ClientSniffingC2SPacket> {
        return ClientSniffingC2SPacket.ID;
    }
}