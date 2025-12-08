import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerReloadC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerReloadC2SPacket> = {id: Identifier.ofVanilla('player_reload')};
    public static readonly CODEC: PacketCodec<PlayerReloadC2SPacket> = PacketCodecs.emptyNew(PlayerReloadC2SPacket);

    public getId(): PayloadId<PlayerReloadC2SPacket> {
        return PlayerReloadC2SPacket.ID;
    }
}