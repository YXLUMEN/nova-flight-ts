import type {Payload} from "../Payload.ts";

export interface ChannelHandler {
    recv(payload: Payload): void;

    report(err: unknown): void;
}