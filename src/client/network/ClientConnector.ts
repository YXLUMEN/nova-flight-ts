import {ClientNetworkChannel} from "./ClientNetworkChannel.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {DEFAULT_CONFIG, RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {ClientIntegratedChannel} from "./ClientIntegratedChannel.ts";
import {invoke} from "@tauri-apps/api/core";
import {error, info, warn} from "@tauri-apps/plugin-log";
import {sleep} from "../../utils/uit.ts";
import type {StartServer} from "../../type/startup.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {ConnectionContext} from "./ConnectionContext.ts";
import {ClientHandshakeHandler} from "./handler/ClientHandshakeHandler.ts";
import {Main2WorkerType, Worker2MainType} from "../../worker/WorkerMsgType.ts";
import {message} from "@tauri-apps/plugin-dialog";
import type {FullScreenNotice} from "../render/ui/FullScreenNotice.ts";

export class ClientConnector {
    private readonly client: NovaFlightClient;
    private readonly ctx: ConnectionContext;

    public constructor(client: NovaFlightClient, ctx: ConnectionContext) {
        this.client = client;
        this.ctx = ctx;
    }

    public async connectToServer(): Promise<void> {
        const address = await this.ctx.getServerAddr();
        if (address === null) {
            this.ctx.stop();
            return;
        }

        this.ctx.setChannel(new ClientNetworkChannel(address, this.client.clientId));

        const screen = this.client.screens;
        const notice = screen.showNotice(
            TranslatableText.of('start.remote.connecting'),
            TranslatableText.of('start.cancel'),
            this.ctx.stop,
        );
        const confirm = notice.waitClose();

        const sniff = this.ctx.sniff(
            1000,
            3,
            (num, max) => {
                const args = [num + 1, max].map(String);
                notice.setMessage(new TranslatableText('start.remote.retry', args));
                return notice.isCancelled();
            });

        const result = await Promise.race([sniff, confirm]);
        if (!result) {
            if (result !== undefined) {
                notice.setMessage(TranslatableText.of('start.remote.fail.found_server'));
                notice.setLabel(TranslatableText.of('start.confirm'));
            }

            await confirm;
            return;
        }

        notice.setMessage(TranslatableText.of('start.connecting'));

        try {
            await Promise.race([this.ctx.connect(), confirm]);
        } catch (err) {
            notice.setMessage(this.mapErr(err));
            notice.setLabel(TranslatableText.of('start.confirm'));

            await confirm;
            return;
        }

        if (notice.isCancelled()) return;

        const config = new ClientHandshakeHandler(this.client, this.client.connection);
        config.clientReady();

        await confirm;
    }

    public async startIntegratedServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const notice = this.client.screens.showNotice(
            TranslatableText.of('start.integrated.start'),
            null,
            this.ctx.stop,
        );

        const worker = new Worker(new URL('../../worker/integrated.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        });
        this.ctx.setWorker(worker);

        const addr = `127.0.0.1:${RuntimeConfig.port}`;
        this.ctx.setChannel(new ClientIntegratedChannel(worker, this.client.clientId));

        await this.checkAndConnect(addr, notice, new ArrayBuffer(0), saveName, worker);
    }

    public async startGeneralServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const notice = this.client.screens.showNotice(
            TranslatableText.of('start.integrated.start'),
            null,
            this.ctx.stop,
        );

        let key: ArrayBuffer;
        try {
            await invoke('stop_server');
            const obj = await invoke('start_server', {port: RuntimeConfig.port});

            if (!Array.isArray(obj)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new TypeError("Key must be an number array");
            }
            key = new Uint8Array(obj).buffer;
        } catch (err) {
            console.error(err);

            const msg = this.mapErr(err);
            await error(msg);

            notice.setMessage(msg);
            notice.setLabel(TranslatableText.of('start.confirm'));
            await notice.waitClose();
            return;
        }

        try {
            await invoke('start_lan_announce', {
                port: RuntimeConfig.port,
                name: `${this.client.playerName}'s game`,
                gameVersion: DEFAULT_CONFIG.gameVersion
            });
        } catch (err) {
            await error(this.mapErr(err));
            await invoke('stop_lan_announce');
        }

        await sleep(300);

        const addr = `127.0.0.1:${RuntimeConfig.port}`;
        this.ctx.setChannel(new ClientNetworkChannel(addr, this.client.clientId));

        await this.checkAndConnect(addr, notice, key, saveName);
    }

    private async checkAndConnect(
        addr: string,
        notice: FullScreenNotice,
        key: ArrayBuffer,
        saveName: string,
        worker?: Worker
    ): Promise<void> {
        notice.setLabel(TranslatableText.of('start.cancel'));

        const confirm = notice.waitClose();
        const canConnect = await Promise.race([this.ctx.sniff(), confirm]);

        // 探测可到达性
        if (!canConnect) {
            if (canConnect !== undefined) {
                notice.setMessage(TranslatableText.of('start.integrated.fail.start'));
                notice.setLabel(TranslatableText.of('start.confirm'));
            }

            await confirm;
            return;
        }

        const config = new ClientHandshakeHandler(this.client, this.client.connection);

        // 内置服务器配置
        const startUp: StartServer = {
            addr,
            key,
            hostUUID: this.client.clientId,
            saveName
        };

        worker = worker === undefined ? new Worker(new URL('../../worker/integrated.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        }) : worker;
        this.ctx.setWorker(worker);

        const connectToServer = async () => {
            notice.setMessage(TranslatableText.of('start.connecting'));
            try {
                await Promise.race([this.ctx.connect(), confirm]);
                if (notice.isCancelled()) return;

                config.clientReady();
            } catch (err) {
                console.error(err);
                await error(this.mapErr(err));

                notice.setMessage(TranslatableText.of('start.fail.connect'));
                notice.setLabel(TranslatableText.of('start.confirm'));
                await confirm;
                this.ctx.stop();
                return;
            }
        };

        const workerFs = this.ctx.workerFs();
        worker.onmessage = event => {
            const w2m = event.data.w2m as Worker2MainType;
            if (w2m === undefined) return;

            switch (w2m) {
                case Worker2MainType.WORKER_READY:
                    worker.postMessage({
                        m2w: Main2WorkerType.START_SERVER,
                        payload: startUp
                    }, {transfer: [key]});
                    break;
                case Worker2MainType.SERVER_START:
                    connectToServer();
                    break;
                case Worker2MainType.SERVER_STOP:
                    this.ctx.stop();
                    break;
                case Worker2MainType.SAVED:
                    this.client.clientCommandManager.addPlainMessage('\x1b[32m游戏已保存');
                    break;
                case Worker2MainType.LOG: {
                    const level = event.data.level;
                    if (level === 'info') info(event.data.message);
                    else if (level === 'warn') warn(event.data.message);
                    else if (level === 'error') error(event.data.message);
                    break;
                }
                case Worker2MainType.POPUP:
                    message(event.data.message, {kind: event.data.kind});
                    break;
                case Worker2MainType.READ_FILE:
                    workerFs.readFile(event.data, worker);
                    break;
                case Worker2MainType.WRITE_FILE:
                    workerFs.writeFile(event.data);
                    break;
                case Worker2MainType.FETCH:
                    workerFs.fetch(event.data, worker);
                    break;
            }
        };

        worker.onerror = event => {
            const err = event.error;
            const msg = Error.isError(err) ?
                `[Server Thread] Crash ${err.name}:${err.message} because ${err.cause} at\n ${err.stack}` :
                `[Server Thread] Crash ${event.type}:${event.message} because ${event.error}`;

            console.error(msg);
            error(msg);
            this.client.requestStop();
        }

        await confirm;
    }

    private mapErr(err: unknown) {
        if (Error.isError(err)) {
            return `[Client] Fail to connect. because: ${err.name}:${err.message} at ${err.stack}`;
        }

        return `[Client] Fail to connect. because: ${String(err)}`;
    }
}