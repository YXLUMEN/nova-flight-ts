import type {Payload, PayloadId} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";

export class StringPacket implements Payload {
    public static readonly ID: PayloadId<StringPacket> = {id: Identifier.ofVanilla('string')};

    public static readonly CODEC: PacketCodec<StringPacket> = PacketCodecs.of<StringPacket>(
        (writer, value) => {
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

    public getId(): PayloadId<StringPacket> {
        return StringPacket.ID;
    }
}