import {ClientNetworkChannel} from "./ClientNetworkChannel.ts";
import {ConnectInfo} from "../render/ui/ConnectInfo.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ClientConfigHandler} from "./handler/ClientConfigHandler.ts";
import {DEFAULT_CONFIG, GlobalConfig} from "../../configs/GlobalConfig.ts";
import {ClientIntegratedChannel} from "./ClientIntegratedChannel.ts";
import {invoke} from "@tauri-apps/api/core";
import {error, info, warn} from "@tauri-apps/plugin-log";
import {sleep} from "../../utils/uit.ts";
import type {StartServer} from "../../type/startup.ts";
import {message} from "@tauri-apps/plugin-dialog";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import type {ConnectionContext} from "./ConnectionContext.ts";

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

        const info = new ConnectInfo(this.client, this.ctx.stop);
        const confirm = info.waitConfirm();

        this.client.setConnectInfo(info);
        info.setMessage(TranslatableText.of('start.remote.connecting'));
        info.setLabel(TranslatableText.of('start.cancel'));

        const sniff = this.ctx.sniff(
            1000,
            3,
            (num, max) => {
                const args = [num + 1, max].map(String);
                info.setMessage(new TranslatableText('start.remote.retry', args));
                return info.isAbort();
            });

        const result = await Promise.race([sniff, confirm]);
        if (!result) {
            if (result !== undefined) {
                info.setMessage(TranslatableText.of('start.remote.fail.found_server'));
                info.setLabel(TranslatableText.of('start.confirm'));
            }

            await confirm;
            return;
        }

        info.setMessage(TranslatableText.of('start.connecting'));

        try {
            await Promise.race([this.ctx.connect(), confirm]);
        } catch (err) {
            info.setMessage(this.mapErr(err));
            info.setLabel(TranslatableText.of('start.confirm'));

            await confirm;
            return;
        }

        if (info.isAbort()) return;

        const config = new ClientConfigHandler(this.client, this.client.connection);
        config.clientReady();

        await info.waitConfirm();
    }

    public async startIntegratedServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const info = new ConnectInfo(this.client, this.ctx.stop);
        this.client.setConnectInfo(info);

        info.setMessage(TranslatableText.of('start.integrated.start'));

        const worker = new Worker(new URL('../../worker/integrated.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        });
        this.ctx.setWorker(worker);

        const addr = `127.0.0.1:${GlobalConfig.port}`;
        this.ctx.setChannel(new ClientIntegratedChannel(worker, this.client.clientId));

        await this.checkAndConnect(addr, info, new ArrayBuffer(0), saveName, worker);
    }

    public async startGeneralServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const info = new ConnectInfo(this.client);
        this.client.setConnectInfo(info);

        info.setMessage(TranslatableText.of('start.integrated.start'));

        let key: ArrayBuffer;
        try {
            await invoke('stop_server');
            const obj = await invoke('start_server', {port: GlobalConfig.port});

            if (!Array.isArray(obj)) {
                // noinspection ExceptionCaughtLocallyJS
                throw new TypeError("Key must be an number array");
            }
            key = new Uint8Array(obj).buffer;
        } catch (err) {
            console.error(err);

            const msg = this.mapErr(err);
            await error(msg);

            info.setMessage(msg);
            info.setLabel(TranslatableText.of('start.confirm'));
            await info.waitConfirm();
            return;
        }

        try {
            await invoke('start_lan_announce', {
                port: GlobalConfig.port,
                name: `${this.client.playerName}'s game`,
                gameVersion: DEFAULT_CONFIG.gameVersion
            });
        } catch (err) {
            await error(this.mapErr(err));
            await invoke('stop_lan_announce');
        }

        await sleep(300);

        const addr = `127.0.0.1:${GlobalConfig.port}`;
        this.ctx.setChannel(new ClientNetworkChannel(addr, this.client.clientId));

        await this.checkAndConnect(addr, info, key, saveName);
    }

    private async checkAndConnect(
        addr: string,
        connectInfo: ConnectInfo,
        key: ArrayBuffer,
        saveName: string,
        worker?: Worker
    ): Promise<void> {
        connectInfo.setLabel(TranslatableText.of('start.cancel'));

        const confirm = connectInfo.waitConfirm();
        const canConnect = await Promise.race([this.ctx.sniff(), confirm]);

        // 探测可到达性
        if (!canConnect) {
            if (canConnect !== undefined) {
                connectInfo.setMessage(TranslatableText.of('start.integrated.fail.start'));
                connectInfo.setLabel(TranslatableText.of('start.confirm'));
            }

            await confirm;
            return;
        }

        const config = new ClientConfigHandler(this.client, this.client.connection);

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
            connectInfo.setMessage(TranslatableText.of('start.connecting'));
            try {
                await Promise.race([this.ctx.connect(), confirm]);
                if (connectInfo.isAbort()) return;

                config.clientReady();
            } catch (err) {
                console.error(err);
                await error(this.mapErr(err));

                connectInfo.setMessage(TranslatableText.of('start.fail.connect'));
                connectInfo.setLabel(TranslatableText.of('start.confirm'));
                await confirm;
                this.ctx.stop();
                return;
            }
        };

        const workerFs = this.ctx.workerFs();
        worker.onmessage = event => {
            switch (event.data.type) {
                case 'worker_ready':
                    worker.postMessage({
                        type: 'start_server',
                        payload: startUp
                    }, {transfer: [key]});
                    break;
                case 'server_start':
                    connectToServer();
                    break;
                case 'server_stop':
                    this.ctx.stop();
                    break;
                case 'saved':
                    this.client.clientCommandManager.addPlainMessage('\x1b[32m游戏已保存');
                    break;
                case 'log':
                    const level = event.data.level;
                    if (level === 'info') info(event.data.message);
                    else if (level === 'warn') warn(event.data.message);
                    else if (level === 'error') error(event.data.message);
                    break;
                case 'message':
                    message(event.data.message, {kind: event.data.kind});
                    break;
                case 'read_file':
                    workerFs.readFile(event.data, worker);
                    break;
                case 'write_file':
                    workerFs.writeFile(event.data);
                    break;
                case 'fetch':
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