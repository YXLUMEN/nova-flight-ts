import type {Payload} from "../../../network/Payload.ts";

export interface Egress {
    enqueue(payload: Payload): void;

    broadcast(payload: Payload): void;

    unicast(sid: number, frame: Uint8Array<ArrayBuffer>): void;

    action(buf: Uint8Array<ArrayBuffer>): void;
}