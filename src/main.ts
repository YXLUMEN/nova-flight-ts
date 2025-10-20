import {Window} from "@tauri-apps/api/window";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";
import {ServerNetwork} from "./server/network/ServerNetwork.ts";
import {ClientNetwork} from "./client/network/ClientNetwork.ts";
import {isServer} from "./configs/WorldConfig.ts";

export const mainWindow = new Window('main');

function main() {
    if (isServer) return;

    ClientNetwork.registerNetworkPacket();
    ServerNetwork.registerNetworkPacket();

    window.oncontextmenu = event => event.preventDefault();

    const client = new NovaFlightClient();
    client.startClient()
        .then(() => client.scheduleStop())
        .then(() => mainWindow.close());
}

main();
