import type {Payload} from "../../network/Payload.ts";
import type {Channel} from "../../network/Channel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {BiConsumer} from "../../type/types.ts";

export interface ServerChannel extends Channel {
    action(buf: Uint8Array<ArrayBuffer>): void;

    enqueue(payload: Payload): void;

    flush(): void;

    sendTo(payload: Payload, target: GameProfile): void;

    sendToId(payload: Payload, target: number): void;

    sendExclude(payload: Payload, ...excludes: GameProfile[]): void;

    setHandler(handler: BiConsumer<number, Payload>): void
}