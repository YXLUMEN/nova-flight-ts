import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";

export class StringPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('string');

    public static readonly CODEC: PacketCodec<StringPacket> = PacketCodec.of<StringPacket>(
        (value, writer) => {
            writer.writeString(value.value);
        },
        (reader) => {
            return new StringPacket(reader.readString());
        }
    );

    public readonly value: string;

    public constructor(value: string) {
        this.value = value;
    }

    public getId(): Identifier {
        return StringPacket.ID;
    }
}