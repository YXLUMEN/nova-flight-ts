import type {Payload} from "../../Payload.ts";

export interface BatchBuffer {
    parse(): Payload[];
}