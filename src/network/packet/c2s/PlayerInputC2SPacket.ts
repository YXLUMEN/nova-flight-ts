import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerInputC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerInputC2SPacket> = {id: Identifier.ofVanilla('player_input')};
    public static readonly CODEC: PacketCodec<PlayerInputC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.key,
        to => new PlayerInputC2SPacket(to)
    );

    public readonly key: string;

    public constructor(key: string) {
        this.key = key;
    }

    public getId(): PayloadId<PlayerInputC2SPacket> {
        return PlayerInputC2SPacket.ID;
    }
}