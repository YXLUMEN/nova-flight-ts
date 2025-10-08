import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class JoinGameS2CPacket implements Payload {
    public static readonly ID: PayloadId<JoinGameS2CPacket> = {id: Identifier.ofVanilla('join_game')};
    public static readonly CODEC: PacketCodec<JoinGameS2CPacket> = PacketCodec.of(
        (value, writer) => writer.writeVarInt(value.playerEntityId),
        reader => new JoinGameS2CPacket(reader.readVarInt())
    );

    public playerEntityId: number;

    public constructor(playerEntityId: number) {
        this.playerEntityId = playerEntityId;
    }

    public getId(): PayloadId<JoinGameS2CPacket> {
        return JoinGameS2CPacket.ID;
    }
}