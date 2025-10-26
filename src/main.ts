import {Window} from "@tauri-apps/api/window";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {ServerNetwork} from "./server/network/ServerNetwork.ts";
import {ClientNetwork} from "./client/network/ClientNetwork.ts";
import {isServer} from "./configs/WorldConfig.ts";
import {UUIDUtil} from "./utils/UUIDUtil.ts";

export const mainWindow = new Window('main');

function main() {
    if (isServer) return;

    ClientNetwork.registerNetworkPacket();
    ServerNetwork.registerNetworkPacket();

    window.oncontextmenu = event => event.preventDefault();

    const username = localStorage.getItem('username');
    if (!username) {
        const client = new NovaFlightClient();
        client.startClient()
            .then(() => mainWindow.close());
        return;
    }

    UUIDUtil.uuidFromUsername(username)
        .then(uuid => localStorage.setItem('clientId', uuid))
        .then(() => new NovaFlightClient())
        .then(client => client.startClient())
        .then(() => mainWindow.close());
}

main();
