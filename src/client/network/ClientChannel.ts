import type {Channel} from "../../network/channel/Channel.ts";

export interface ClientChannel extends Channel {
    clearHandler(): void;

    connect(): Promise<void>;

    sniff(
        retryDelay?: number,
        maxRetries?: number,
        onTry?: (attempts: number, maxRetries: number) => boolean
    ): Promise<boolean>;
}