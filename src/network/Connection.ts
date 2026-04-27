import type {Payload} from "./Payload.ts";

export interface Connection {
    tick(): void;

    send(packet: Payload): void;
}