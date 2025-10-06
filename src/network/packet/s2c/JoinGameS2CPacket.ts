import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class JoinGameS2CPacket implements Payload {
    public static readonly ID: PayloadId<JoinGameS2CPacket> = {id: Identifier.ofVanilla('join_game')};
    public static readonly CODEC: PacketCodec<JoinGameS2CPacket> = PacketCodec.empty(JoinGameS2CPacket);

    public getId(): PayloadId<JoinGameS2CPacket> {
        return JoinGameS2CPacket.ID;
    }
}