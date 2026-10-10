import type {ConnectionContext} from "../client/network/ConnectionContext.ts";
import type {Consumer} from "../type/types.ts";
import type {StartServer} from "../type/startup.ts";
import {error, info, warn} from "@tauri-apps/plugin-log";
import {message} from "@tauri-apps/plugin-dialog";
import {Main2WorkerType, Worker2MainType} from "./WorkerMsgType.ts";

export class ServerWorker {
    private readonly worker: Worker;

    private pendingStop: Promise<any> | null = null;
    private state: WorkerState = WorkerState.UNINITIALIZED;

    public constructor(worker: Worker) {
        this.worker = worker;
    }

    public start(ctx: ConnectionContext, connectToServer: Consumer<void>, startUp: StartServer) {
        if (!this.changeState(WorkerState.SPAWNING)) return;

        const worker = this.worker;
        const workerFs = ctx.workerFs();
        const client = ctx.client;
        const stopWorld = ctx.stop;

        worker.onmessage = event => {
            const w2m = event.data.w2m as Worker2MainType;
            if (w2m === undefined) return;

            switch (w2m) {
                // 状态管理
                case Worker2MainType.WORKER_READY: {
                    if (!this.changeState(WorkerState.READY)) return;
                    worker.postMessage({
                        m2w: Main2WorkerType.START_SERVER,
                        payload: startUp
                    }, {transfer: [startUp.key]});
                    startUp = null!;
                    return;
                }
                case Worker2MainType.SERVER_START : {
                    if (!this.changeState(WorkerState.RUNNING)) return;
                    connectToServer();
                    connectToServer = null!; // 释放闭包
                    return;
                }
                case Worker2MainType.SERVER_STOP: {
                    if (this.state >= WorkerState.STOPPING) return;
                    stopWorld();
                    return;
                }
                case Worker2MainType.SERVER_SHUTDOWN: {
                    // 服务器未完全启动时抛错
                    if (!this.changeState(WorkerState.SHUTDOWN)) return;
                    client.leaveAndShow(`Server shutdown unexpectedly.\n${event.data.reason}`);
                    worker.terminate();
                    return;
                }
                // 支持
                case Worker2MainType.SAVED: {
                    client.clientCommandManager.addPlainMessage('\x1b[32m游戏已保存');
                    return;
                }
                case Worker2MainType.LOG: {
                    const level = event.data.level;
                    if (level === 'info') void info(event.data.message);
                    else if (level === 'warn') void warn(event.data.message);
                    else if (level === 'error') void error(event.data.message);
                    return;
                }
                case Worker2MainType.POPUP: {
                    void message(event.data.message, {kind: event.data.kind});
                    return;
                }
                case Worker2MainType.READ_FILE: {
                    void workerFs.readFile(event.data, worker);
                    return;
                }
                case Worker2MainType.WRITE_FILE: {
                    void workerFs.writeFile(event.data);
                    return;
                }
                case Worker2MainType.FETCH: {
                    void workerFs.fetch(event.data, worker);
                    return;
                }
            }
        };

        worker.onerror = event => {
            const err = event.error;
            const msg = Error.isError(err) ?
                `[Server Thread] Crash ${err.name}:${err.message} because ${err.cause} at\n ${err.stack}` :
                `[Server Thread] Crash ${event.type} because ${event.message}`;

            console.error(msg);
            void error(msg);
            client.leaveAndShow(msg);
        }
    }

    public halt(): Promise<any> {
        if (this.state <= WorkerState.SPAWNING) {
            this.changeState(WorkerState.SHUTDOWN);
            this.worker.terminate();
            return Promise.resolve();
        }

        if (!this.changeState(WorkerState.STOPPING)) {
            return this.pendingStop ? this.pendingStop : Promise.resolve();
        }

        const worker = this.worker;
        const {promise, resolve} = Promise.withResolvers<any>();
        this.pendingStop = promise;

        const settle = (reason?: any) => {
            this.changeState(WorkerState.SHUTDOWN);
            clearTimeout(shutTimeout);
            worker.terminate();
            worker.onmessage = null;
            worker.onerror = null;
            resolve(reason);
        };

        const shutTimeout = setTimeout(() => {
            void warn('[Client] Waiting worker terminate timeout');
            settle();
        }, 8000);

        worker.onmessage = event => {
            if (event.data.w2m === Worker2MainType.SERVER_SHUTDOWN) settle(event.data.reason);
        };

        worker.postMessage({m2w: Main2WorkerType.STOP_SERVER});
        return promise;
    }

    public post(message: any, transfer?: StructuredSerializeOptions): void {
        this.worker.postMessage(message, transfer);
    }

    public addEventListener<K extends keyof WorkerEventMap>(
        type: K,
        listener: (this: Worker, ev: WorkerEventMap[K]) => any,
        options?: boolean | AddEventListenerOptions
    ): void {
        this.worker.addEventListener(type, listener, options);
    }

    public removeEventListener<K extends keyof WorkerEventMap>(
        type: K,
        listener: (this: Worker, ev: WorkerEventMap[K]) => any,
        options?: boolean | EventListenerOptions
    ): void {
        this.worker.removeEventListener(type, listener, options);
    }

    private changeState(state: WorkerState): boolean {
        if (state <= this.state) return false;
        this.state = state;
        return true;
    }
}

const enum WorkerState {
    UNINITIALIZED,
    SPAWNING,
    READY,
    RUNNING,
    STOPPING,
    SHUTDOWN,
}