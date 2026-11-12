import type {Payload} from "../../network/Payload.ts";
import type {Channel} from "../../network/Channel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";

export interface ServerChannel extends Channel {
    action(buf: Uint8Array<ArrayBuffer>): void;

    enqueue(payload: Payload): void;

    flush(): void;

    // 单发/排除不会入队
    sendTo(payload: Payload, target: GameProfile): void;

    sendToId(payload: Payload, target: number): void;

    sendExclude(payload: Payload, ...excludes: GameProfile[]): void;

    setOnPayload(handler: PayloadHandler): void;

    setOnFailDecode(handler: DecodeErrorHandler): void;
}

export type PayloadHandler = (sid: number, payload: Payload) => void;
export type DecodeErrorHandler = (sid: number, err: unknown) => void;