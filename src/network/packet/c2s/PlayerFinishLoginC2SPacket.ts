import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerFinishLoginC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerFinishLoginC2SPacket> = {id: Identifier.ofVanilla('player_fi_login')};
    public static readonly CODEC: PacketCodec<PlayerFinishLoginC2SPacket> = PacketCodecs.empty(PlayerFinishLoginC2SPacket);


    public getId(): PayloadId<PlayerFinishLoginC2SPacket> {
        return PlayerFinishLoginC2SPacket.ID;
    }
}