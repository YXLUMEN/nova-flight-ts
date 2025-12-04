import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class AudioControlS2CPacket implements Payload {
    public static readonly ID: PayloadId<AudioControlS2CPacket> = {id: Identifier.ofVanilla('audio_control')};
    public static readonly CODEC: PacketCodec<AudioControlS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeByte(value.action);
        },
        reader => new AudioControlS2CPacket(
            reader.readUnsignByte()
        )
    );

    public readonly action: number

    public constructor(action: number) {
        this.action = action;
    }

    public getId(): PayloadId<AudioControlS2CPacket> {
        return AudioControlS2CPacket.ID;
    }
}