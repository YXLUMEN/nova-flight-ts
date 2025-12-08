import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class ServerShutdownS2CPacket implements Payload {
    public static readonly ID: PayloadId<ServerShutdownS2CPacket> = {id: Identifier.ofVanilla('server_shutdown')};
    public static readonly CODEC: PacketCodec<ServerShutdownS2CPacket> = PacketCodecs.emptyNew(ServerShutdownS2CPacket);

    public getId(): PayloadId<ServerShutdownS2CPacket> {
        return ServerShutdownS2CPacket.ID;
    }
}