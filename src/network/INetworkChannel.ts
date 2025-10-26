import type {Payload, PayloadId} from "./Payload.ts";
import type {Consumer} from "../apis/types.ts";

export interface INetworkChannel {
    connect(): Promise<void>;

    disconnect(): void;

    sniff(url: string, retryDelay: number, maxRetries: number): Promise<boolean>;

    receive<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void;

    send<T extends Payload>(payload: T): void;
}