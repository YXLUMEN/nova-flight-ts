import type {ClientBus} from "./bus/ClientBus.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {ClientWorkerFS} from "../ClientWorkerFS.ts";
import type {ServerWorker} from "../../worker/ServerWorker.ts";
import type {SocketAddr} from "../../network/SocketAddr.ts";

export interface ConnectionContext {
    readonly client: NovaFlightClient;

    getServerAddr(): Promise<SocketAddr | null>;

    bus(): ClientBus;

    hasWorker(): boolean;

    setWorker(worker: ServerWorker | null): void;

    stop(): void;

    workerFs(): ClientWorkerFS;
}
