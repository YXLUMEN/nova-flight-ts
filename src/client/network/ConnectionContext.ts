import type {ClientChannel} from "./ClientChannel.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {ClientWorkerFS} from "../ClientWorkerFS.ts";
import type {ServerWorker} from "../../worker/ServerWorker.ts";

export interface ConnectionContext {
    readonly client: NovaFlightClient;

    getServerAddr(): Promise<string | null>;

    channel(): ClientChannel;

    setChannel(channel: ClientChannel): void;

    hasWorker(): boolean;

    setWorker(worker: ServerWorker | null): void;

    stop(): void;

    workerFs(): ClientWorkerFS;
}
