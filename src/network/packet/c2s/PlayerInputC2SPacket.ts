import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";
import {isAscii} from "../../../utils/uit.ts";
import {IllegalArgumentError} from "../../../type/errors.ts";

export class PlayerInputC2SPacket implements Payload {
    public static readonly ID: PayloadType<PlayerInputC2SPacket> = payloadType('player_input');
    public static readonly CODEC: PacketCodec<PlayerInputC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.key,
        to => new PlayerInputC2SPacket(to)
    );

    public readonly key: string;

    public constructor(key: string) {
        this.key = key;
    }

    public static create(key: string): PlayerInputC2SPacket {
        if (!isAscii(key)) throw new IllegalArgumentError('ASCII Only');
        return new PlayerInputC2SPacket(key);
    }

    public type(): PayloadType<PlayerInputC2SPacket> {
        return PlayerInputC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onPlayerInput(this);
    }

    public estimateSize(): number {
        // ASCII Only
        return this.key.length;
    }
}