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
        tryCallback?: (attempts: number, maxRetries: number) => boolean,
    ): Promise<boolean>;

    clearHandlers(): void;

    setRemote(addr: string): void;
}