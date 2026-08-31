import type {PacketListener} from "../../handler/PacketListener.ts";

export interface BatchBuffer {
    parse(handler: PacketListener): void;
}