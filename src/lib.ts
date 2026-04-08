import {ClientPackets} from "./client/network/ClientPackets.ts";
import {ServerPackets} from "./server/network/ServerPackets.ts";
import {UUIDUtil} from "./utils/UUIDUtil.ts";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {mainWindow} from "./main.ts";
import {error} from "@tauri-apps/plugin-log";
import {isDev} from "./configs/GlobalConfig.ts";
import {PayloadTypeRegistry} from "./network/PayloadTypeRegistry.ts";
import {RelayPackets} from "./network/RelayPackets.ts";

export function run() {
    window.oncontextmenu = event => event.preventDefault();

    const ctrl = new AbortController();
    window.addEventListener('keydown', event => {
        event.preventDefault();
    }, {signal: ctrl.signal});

    RelayPackets.registerNetworkPacket();
    ServerPackets.registerNetworkPacket();
    ClientPackets.registerNetworkPacket();
    PayloadTypeRegistry.freeze();

    const playerName = localStorage.getItem('playerName') ?? 'null';
    UUIDUtil.uuidFromUsername(playerName)
        .then(uuid => {
            localStorage.setItem('clientId', uuid);
            localStorage.setItem('playerName', playerName);

            const client = new NovaFlightClient();
            ctrl.abort();
            return client.startClient();
        })
        .then(() => mainWindow.close())
        .catch(err => {
            if (err instanceof Error) {
                const msg = `Error while starting client: ${err.message} by ${err.cause}\n at ${err.stack}`;
                console.error(msg);
                return error(msg);
            }
            const msg = `Error while starting client: ${err}`;
            console.error(msg);
            return error(msg);
        })
        .then(() => {
            if (isDev) return;
            return mainWindow.close();
        });
}