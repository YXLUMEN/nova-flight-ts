import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class RequestPositionC2SPacket implements Payload {
    public static readonly ID: PayloadId<RequestPositionC2SPacket> = {id: Identifier.ofVanilla('request_position')};
    public static readonly CODEC: PacketCodec<RequestPositionC2SPacket> = PacketCodecs.empty(RequestPositionC2SPacket);

    public getId(): PayloadId<RequestPositionC2SPacket> {
        return RequestPositionC2SPacket.ID;
    }
}