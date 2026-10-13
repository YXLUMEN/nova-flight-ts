import type {StartServer} from "../../type/startup.ts";
import type {ConnectionContext} from "./ConnectionContext.ts";
import type {FullscreenNotice} from "../page/compound/FullscreenNotice.ts";
import {error} from "@tauri-apps/plugin-log";
import {startLanAnnounce, stopLanAnnounce} from "../ipc/lan_discovery.ts";
import {startServer, stopServer} from "../ipc/integrated_server.ts";
import {sleep} from "../../utils/uit.ts";
import {ClientNetworkChannel} from "./ClientNetworkChannel.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {DEFAULT_CONFIG, RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {ClientIntegratedChannel} from "./ClientIntegratedChannel.ts";
import {ClientHandshakeHandler} from "./handler/ClientHandshakeHandler.ts";
import {ServerWorker} from "../../worker/ServerWorker.ts";

export class ClientConnector {
    private readonly ctx: ConnectionContext;

    public constructor(ctx: ConnectionContext) {
        this.ctx = ctx;
    }

    public async connectToServer(): Promise<void> {
        const address = await this.ctx.getServerAddr();
        if (address === null) {
            this.ctx.stop();
            return;
        }

        const client = this.ctx.client;
        this.ctx.setChannel(new ClientNetworkChannel(address, client.clientId));
        const channel = this.ctx.channel();

        const screen = client.layer;
        const notice = screen.showNotice(
            TranslatableText.of('start.remote.connecting'),
            TranslatableText.of('start.cancel'),
            this.ctx.stop,
        );
        const confirm = notice.waitClose();

        const sniff = channel.sniff(
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
            await Promise.race([channel.connect(), confirm]);
        } catch (err) {
            notice.setMessage(this.mapErr(err));
            notice.setLabel(TranslatableText.of('start.confirm'));

            await confirm;
            return;
        }

        if (notice.isCancelled()) return;

        const config = new ClientHandshakeHandler(client, client.connection);
        config.clientReady();

        await confirm;
    }

    public async startIntegratedServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const client = this.ctx.client;
        const notice = client.layer.showNotice(
            TranslatableText.of('start.integrated.start'),
            null,
            this.ctx.stop,
        );

        const worker = new Worker(new URL('../../worker/integrated.worker.ts', import.meta.url), {
            type: 'module',
            name: 'server',
        });
        const server = new ServerWorker(worker);
        this.ctx.setWorker(server);

        const addr = `127.0.0.1:${RuntimeConfig.port}`;
        this.ctx.setChannel(new ClientIntegratedChannel(worker, client.clientId));

        await this.checkAndConnect(addr, notice, new ArrayBuffer(0), saveName, server);
    }

    public async startGeneralServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const client = this.ctx.client;
        const notice = client.layer.showNotice(
            TranslatableText.of('start.integrated.start'),
            null,
            this.ctx.stop,
        );

        let key: ArrayBuffer;
        try {
            await stopServer();
            key = await startServer(RuntimeConfig.port);
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
            await startLanAnnounce(
                RuntimeConfig.port,
                `${client.playerName}'s game`,
                DEFAULT_CONFIG.gameVersion,
            );
        } catch (err) {
            await error(this.mapErr(err));
            await stopLanAnnounce();
        }

        await sleep(300);

        const addr = `127.0.0.1:${RuntimeConfig.port}`;
        this.ctx.setChannel(new ClientNetworkChannel(addr, client.clientId));

        await this.checkAndConnect(addr, notice, key, saveName);
    }

    private async checkAndConnect(
        addr: string,
        notice: FullscreenNotice,
        key: ArrayBuffer,
        saveName: string,
        server?: ServerWorker
    ): Promise<void> {
        notice.setLabel(TranslatableText.of('start.cancel'));

        const client = this.ctx.client;
        const channel = this.ctx.channel();
        const confirm = notice.waitClose();
        const canConnect = await Promise.race([channel.sniff(), confirm]);

        // 探测可到达性
        if (!canConnect) {
            if (canConnect !== undefined) {
                notice.setMessage(TranslatableText.of('start.integrated.fail.start'));
                notice.setLabel(TranslatableText.of('start.confirm'));
            }

            await confirm;
            return;
        }

        if (!server) {
            const worker = new Worker(new URL('../../worker/integrated.worker.ts', import.meta.url), {
                type: 'module',
                name: 'server',
            });
            server = new ServerWorker(worker);
            this.ctx.setWorker(server);
        }

        const config = new ClientHandshakeHandler(client, client.connection);

        // 内置服务器配置
        const startUp: StartServer = {
            addr,
            key,
            hostUUID: client.clientId,
            saveName
        };

        const connectToServer = async () => {
            notice.setMessage(TranslatableText.of('start.connecting'));
            try {
                await Promise.race([channel.connect(), confirm]);
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

        server.start(this.ctx, connectToServer, startUp);
        // 显示服务器回执,等待玩家确认
        await confirm;
    }

    private mapErr(err: unknown) {
        if (Error.isError(err)) {
            return `[Client] Fail to connect. because: ${err.name}:${err.message} at ${err.stack}`;
        }

        return `[Client] Fail to connect. because: ${String(err)}`;
    }
}