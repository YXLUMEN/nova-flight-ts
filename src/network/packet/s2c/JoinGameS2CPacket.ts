import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class JoinGameS2CPacket implements Payload {
    public static readonly ID: PayloadId<JoinGameS2CPacket> = {id: Identifier.ofVanilla('join_game')};
    public static readonly CODEC: PacketCodec<JoinGameS2CPacket> = PacketCodecs.of(
        (writer, value) => writer.writeVarUInt(value.playerEntityId),
        reader => new JoinGameS2CPacket(reader.readVarUInt())
    );

    public playerEntityId: number;

    public constructor(playerEntityId: number) {
        this.playerEntityId = playerEntityId;
    }

    public getId(): PayloadId<JoinGameS2CPacket> {
        return JoinGameS2CPacket.ID;
    }
}