import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class GameMessageS2CPacket implements Payload {
    public static readonly ID: PayloadId<GameMessageS2CPacket> = {id: Identifier.ofVanilla('game_msg')};

    public static readonly CODEC: PacketCodec<GameMessageS2CPacket> = PacketCodecs.of<GameMessageS2CPacket>(
        (writer, value) => {
            writer.writeString(value.value);
        },
        (reader) => {
            return new GameMessageS2CPacket(reader.readString());
        }
    );

    public readonly value: string;

    public constructor(value: string) {
        this.value = value;
    }

    public getId(): PayloadId<GameMessageS2CPacket> {
        return GameMessageS2CPacket.ID;
    }
}