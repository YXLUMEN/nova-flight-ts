import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerTechResetC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerTechResetC2SPacket> = {id: Identifier.ofVanilla('player_reset_tech')};
    public static readonly CODEC: PacketCodec<PlayerTechResetC2SPacket> = PacketCodecs.emptyNew(PlayerTechResetC2SPacket);

    public getId(): PayloadId<PlayerTechResetC2SPacket> {
        return PlayerTechResetC2SPacket.ID;
    }
}