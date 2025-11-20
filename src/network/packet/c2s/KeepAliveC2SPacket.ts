import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class KeepAliveC2SPacket implements Payload {
    public static readonly ID: PayloadId<KeepAliveC2SPacket> = {id: Identifier.ofVanilla('keep_alive')};

    public static readonly CODEC: PacketCodec<KeepAliveC2SPacket> = PacketCodecs.of<KeepAliveC2SPacket>(
        (writer, value) => {
            writer.writeUint32(value.id);
        },
        (reader) => {
            return new KeepAliveC2SPacket(reader.readUint32());
        }
    );

    public readonly id: number;

    public constructor(id: number) {
        this.id = id;
    }

    public getId(): PayloadId<KeepAliveC2SPacket> {
        return KeepAliveC2SPacket.ID;
    }
}