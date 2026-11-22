import type {StartServer} from "../../type/startup.ts";
import type {ConnectionContext} from "./ConnectionContext.ts";
import type {FullscreenNotice} from "../page/compound/FullscreenNotice.ts";
import {startLanAnnounce, stopLanAnnounce} from "../ipc/lan_discovery.ts";
import {startServer, stopServer} from "../ipc/integrated_server.ts";
import {requireNotNull, sleep} from "../../utils/util.ts";
import {DEFAULT_CONFIG, RuntimeConfig} from "../../configs/RuntimeConfig.ts";
import {ClientNetworkBus} from "./bus/ClientNetworkBus.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ClientIntegratedBus} from "./bus/ClientIntegratedBus.ts";
import {ClientHandshakeHandler} from "./handler/ClientHandshakeHandler.ts";
import {ServerWorker} from "../../worker/ServerWorker.ts";
import {Log} from "../../worker/log.ts";
import {SocketAddr} from "../../network/SocketAddr.ts";
import {ClientChannel} from "./channel/ClientChannel.ts";
import {ClientIntegratedChannel} from "./channel/ClientIntegratedChannel.ts";

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
        const bus = new ClientNetworkBus(address, client.clientId);
        client.changeBus(bus);
        client.setChannel(new ClientChannel(bus));

        const screen = client.layer;
        const notice = screen.showNotice(
            TranslatableText.of('start.remote.connecting'),
            TranslatableText.of('start.cancel'),
            this.ctx.stop,
        );
        const confirm = notice.waitClose();

        const sniff = bus.sniff(
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
            await Promise.race([bus.connect(), confirm]);
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

        const bus = new ClientIntegratedBus(worker, client.clientId);
        client.connection.address = SocketAddr.INTEGRATED;
        client.changeBus(bus);
        client.setChannel(new ClientIntegratedChannel(bus));

        await this.checkAndConnect(SocketAddr.INTEGRATED.toString(), notice, new ArrayBuffer(0), saveName, server);
    }

    public async startGeneralServer(saveName: string): Promise<void> {
        if (this.ctx.hasWorker()) return;

        const client = this.ctx.client;
        const notice = client.layer.showNotice(
            TranslatableText.of('start.integrated.start'),
            null,
            this.ctx.stop,
        );

        await stopServer();
        const serverResult = await startServer(RuntimeConfig.port);
        if (serverResult.isErr()) {
            const err = serverResult.unwrapErr();
            const msg = this.mapErr(err);
            Log.error(msg);

            notice.setMessage(msg);
            notice.setLabel(TranslatableText.of('start.confirm'));
            await notice.waitClose();
            return;
        }

        const lanResult = await startLanAnnounce(
            RuntimeConfig.port,
            `${client.playerName}'s game`,
            DEFAULT_CONFIG.gameVersion,
        );
        if (lanResult.isErr()) {
            Log.error(this.mapErr(lanResult.unwrapErr()));
            await stopLanAnnounce();
        }

        await sleep(300);

        const addr = `${RuntimeConfig.serverHost}:${RuntimeConfig.port}`;
        const address = requireNotNull(SocketAddr.from(addr));
        const bus = new ClientNetworkBus(address, client.clientId);
        client.connection.address = address;
        client.changeBus(bus);
        client.setChannel(new ClientChannel(bus));

        await this.checkAndConnect(addr, notice, serverResult.unwrap(), saveName);
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
        const bus = this.ctx.bus();
        const confirm = notice.waitClose();
        const canConnect = await Promise.race([bus.sniff(), confirm]);

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
                await Promise.race([bus.connect(), confirm]);
                if (notice.isCancelled()) return;

                config.clientReady();
            } catch (err) {
                Log.error(this.mapErr(err));

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
            return `[Client] Fail to connect. because: ${err.name}:${err.message}, by ${err.cause} at:\n  ${err.stack}`;
        }
        return `[Client] Fail to connect. because: ${String(err)}`;
    }
}