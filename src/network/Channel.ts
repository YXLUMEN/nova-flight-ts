import type {Payload} from "./Payload.ts";

export interface Channel {
    connect(): Promise<void>;

    disconnect(): void;

    sniff(url: string, retryDelay: number, maxRetries: number): Promise<boolean>;

    send<T extends Payload>(payload: T): void;

    isOpen(): boolean;
}