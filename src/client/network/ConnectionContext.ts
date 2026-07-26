import type {ClientChannel} from "./ClientChannel.ts";
import {ClientWorkerFS} from "../ClientWorkerFS.ts";

export interface ConnectionContext {
    getServerAddr(): Promise<string | null>;

    setChannel(channel: ClientChannel): void;

    sniff(
        retryDelay?: number,
        maxRetries?: number,
        onTry?: (attempts: number, maxRetries: number) => boolean
    ): Promise<boolean>;

    connect(): Promise<void>;

    hasWorker(): boolean;

    setWorker(worker: Worker | null): void;

    stop(): void;

    workerFs(): ClientWorkerFS;
}
