import {ClientPackets} from "./client/network/ClientPackets.ts";
import {ServerPackets} from "./server/network/ServerPackets.ts";
import {UUIDUtil} from "./utils/UUIDUtil.ts";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {mainWindow} from "./main.ts";
import {error} from "@tauri-apps/plugin-log";
import {isDev} from "./configs/GlobalConfig.ts";
import {CodecRegistry} from "./network/CodecRegistry.ts";
import {RelayPackets} from "./network/RelayPackets.ts";
import {PageSplicer} from "./client/page/PageSplicer.ts";

export async function run() {
    window.oncontextmenu = event => event.preventDefault();

    const ctrl = new AbortController();
    window.addEventListener('keydown', event => {
        event.preventDefault();
    }, {signal: ctrl.signal});

    const pages = new PageSplicer({
        basePath: 'pages',
        concurrency: 16,
        fetchTimeout: 1000,
        maxRetries: 2,
        deferTimeoutBase: 600
    });
    await pages.bootstrap(document.body);

    RelayPackets.registerNetworkPacket();
    ServerPackets.registerNetworkPacket();
    ClientPackets.registerNetworkPacket();
    CodecRegistry.settle();

    const playerName = localStorage.getItem('playerName') ?? 'null';
    try {
        const uuid = await UUIDUtil.uuidFromUsername(playerName);
        localStorage.setItem('clientId', uuid);
        localStorage.setItem('playerName', playerName);

        const client = new NovaFlightClient();
        ctrl.abort();

        await client.startClient();
        await mainWindow.close();
    } catch (err) {
        if (Error.isError(err)) {
            const msg = `Error while starting client: ${err.message} by ${err.cause}\n at ${err.stack}`;
            console.error(msg);
            return error(msg);
        }
        const msg = `Error while starting client: ${err}`;
        console.error(msg);
        await error(msg);

        if (isDev) return;
        await mainWindow.close();
    }
}