import {Window} from "@tauri-apps/api/window";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {ServerNetwork} from "./server/network/ServerNetwork.ts";
import {ClientNetwork} from "./client/network/ClientNetwork.ts";
import {isDev, isServer} from "./configs/WorldConfig.ts";
import {UUIDUtil} from "./utils/UUIDUtil.ts";
import {error} from "@tauri-apps/plugin-log";

export const mainWindow = new Window('main');

function main() {
    if (isServer) return;

    ClientNetwork.registerNetworkPacket();
    ServerNetwork.registerNetworkPacket();

    window.oncontextmenu = event => event.preventDefault();

    const playerName = localStorage.getItem('playerName') ?? 'null';
    UUIDUtil.uuidFromUsername(playerName)
        .then(uuid => {
            localStorage.setItem('clientId', uuid);
            localStorage.setItem('playerName', playerName);

            const client = new NovaFlightClient();
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

main();
