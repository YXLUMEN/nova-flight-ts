import {Window} from "@tauri-apps/api/window";
import {invoke} from "@tauri-apps/api/core";
import {error} from "@tauri-apps/plugin-log";
import {isDev} from "./configs/RuntimeConfig.ts";
import {ProtocolRegistry} from "./network/packet/ProtocolRegistry.ts";
import {CodecRegistry} from "./network/CodecRegistry.ts";
import {PageSplicer} from "./client/page/PageSplicer.ts";
import {Settings} from "./client/settings/Settings.ts";
import {ClientStartup} from "./client/ClientStartup.ts";

export const app = new Window('main');

export async function run() {
    const ctrl = new AbortController();
    preventEvents(ctrl.signal);

    const pages = new PageSplicer({
        basePath: 'pages',
        concurrency: 16,
        fetchTimeout: 1000,
        maxRetries: 2,
        deferTimeoutBase: 600,
    });
    await pages.bootstrap(document.body);

    ProtocolRegistry.register();

    try {
        const startup = new ClientStartup(CodecRegistry.VERSION);
        await startup.load();
        const client = startup.buildClient();
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
            await error(msg);
            return;
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