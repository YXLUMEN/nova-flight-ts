import type {BiConsumer} from "../type/types.ts";
import type {Payload} from "./Payload.ts";

export interface Channel {
    getSessionId(): number;

    isConnected(): boolean;

    send(payload: Payload): void;

    connect(): Promise<void>;

    disconnect(): void;

    sniff(
        retryDelay?: number,
        maxRetries?: number,
        tryCallback?: BiConsumer<number, number>,
    ): Promise<boolean>;

    clearHandlers(): void;

    setRemote(addr: string): void;
}