import type {PacketListener} from "../../PacketListener.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {Payload} from "../../Payload.ts";

export interface BatchBuffer {
    parse(handler: PacketListener, codec: PacketCodec<Payload>): void;
}