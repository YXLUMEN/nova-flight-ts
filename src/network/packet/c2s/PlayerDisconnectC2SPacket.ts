import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerDisconnectC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerDisconnectC2SPacket> = {id: Identifier.ofVanilla('player_disconnect')};
    public static readonly CODEC: PacketCodec<PlayerDisconnectC2SPacket> = PacketCodecs.empty(PlayerDisconnectC2SPacket);

    public getId(): PayloadId<PlayerDisconnectC2SPacket> {
        return PlayerDisconnectC2SPacket.ID;
    }
}