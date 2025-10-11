import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ServerReadyS2CPacket implements Payload {
    public static readonly ID: PayloadId<ServerReadyS2CPacket> = {id: Identifier.ofVanilla('server_ready')};
    public static readonly CODEC: PacketCodec<ServerReadyS2CPacket> = PacketCodecs.empty(ServerReadyS2CPacket);

    public getId(): PayloadId<ServerReadyS2CPacket> {
        return ServerReadyS2CPacket.ID;
    }
}