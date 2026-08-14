import {Window} from "@tauri-apps/api/window";
import {ProtocolRegistry} from "./network/packet/ProtocolRegistry.ts";
import {UUIDUtil} from "./utils/UUIDUtil.ts";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {error} from "@tauri-apps/plugin-log";
import {isDev} from "./configs/GlobalConfig.ts";
import {CodecRegistry} from "./network/CodecRegistry.ts";
import {PageSplicer} from "./client/page/PageSplicer.ts";
import type {UUID} from "./type/types.ts";

export const app = new Window('main');

export async function run() {
    const ctrl = new AbortController();
    preventEvents(ctrl.signal);

    const pages = new PageSplicer({
        basePath: 'pages',
        concurrency: 16,
        fetchTimeout: 1000,
        maxRetries: 2,
        deferTimeoutBase: 600
    });
    await pages.bootstrap(document.body);

    ProtocolRegistry.register();

    try {
        const rawName = localStorage.getItem('playerName') ?? 'player';
        const playerName = rawName.slice(0, 64);

        const uuid: UUID = await UUIDUtil.uuidFromUsername(playerName);
        const clientId: UUID = UUIDUtil.isValidUUID(uuid) ? uuid : crypto.randomUUID();

        localStorage.setItem('clientId', clientId);
        localStorage.setItem('playerName', playerName);

        const client = new NovaFlightClient(clientId, playerName, CodecRegistry.VERSION);
        ctrl.abort();

        await client.startClient();
        await app.close();
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
        await app.close();
    }
}

function preventEvents(signal: AbortSignal) {
    window.oncontextmenu = event => event.preventDefault();

    window.addEventListener('keydown', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
    }, {signal});

    window.addEventListener('beforeunload', event => {
        event.preventDefault();
    }, {signal});
}