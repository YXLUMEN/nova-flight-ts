import type {UUID} from "./type/types.ts";
import {Window} from "@tauri-apps/api/window";
import {invoke} from "@tauri-apps/api/core";
import {error} from "@tauri-apps/plugin-log";
import {isValidUUID, uuidFromUsername} from "./utils/UUIDUtil.ts";
import {isDev} from "./configs/RuntimeConfig.ts";
import {ProtocolRegistry} from "./network/packet/ProtocolRegistry.ts";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {CodecRegistry} from "./network/CodecRegistry.ts";
import {PageSplicer} from "./client/page/PageSplicer.ts";
import {Settings} from "./client/settings/Settings.ts";
import {BindSettings} from "./client/settings/BindSettings.ts";

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
        // 先加载偏好,后续系统可以据此加载
        await Settings.OPTIONS.load();
        BindSettings.init();

        const rawName = localStorage.getItem('playerName') ?? 'player';
        const playerName = rawName.slice(0, 64);

        const uuid: UUID = await uuidFromUsername(playerName);
        const clientId: UUID = isValidUUID(uuid) ? uuid : crypto.randomUUID();

        localStorage.setItem('clientId', clientId);
        localStorage.setItem('playerName', playerName);

        const client = new NovaFlightClient(clientId, playerName, CodecRegistry.VERSION);
        ctrl.abort();

        await app.once('save_before_close', async () => {
            try {
                await client.saveAll();
            } catch (e) {
                console.error(e);
                await error(`[App] Failed to save when closing app, reason: ${e}`);
            }
            await invoke('confirm_save_done');
        });

        await client.startClient();
        await Settings.OPTIONS.save();
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