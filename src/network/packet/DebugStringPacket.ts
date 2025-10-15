import type {Payload, PayloadId} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";

export class DebugStringPacket implements Payload {
    public static readonly ID: PayloadId<DebugStringPacket> = {id: Identifier.ofVanilla('string')};

    public static readonly CODEC: PacketCodec<DebugStringPacket> = PacketCodecs.of<DebugStringPacket>(
        (writer, value) => {
            writer.writeString(value.value);
        },
        (reader) => {
            return new DebugStringPacket(reader.readString());
        }
    );

    public readonly value: string;

    public constructor(value: string) {
        this.value = value;
    }

    public getId(): PayloadId<DebugStringPacket> {
        return DebugStringPacket.ID;
    }
}