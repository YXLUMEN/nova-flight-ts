import type {Payload} from "./Payload.ts";
import type {BiConsumer, Consumer} from "../type/types.ts";

export interface Channel {
    connect(): Promise<void>;

    disconnect(): void;

    sniff(
        url: string,
        retryDelay?: number,
        maxRetries?: number,
        tryCallback?: BiConsumer<number, number>,
        failCallback?: Consumer<void>
    ): Promise<boolean>;

    send<T extends Payload>(payload: T): void;

    isOpen(): boolean;
}