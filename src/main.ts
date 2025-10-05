import {Window} from "@tauri-apps/api/window";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";

export const mainWindow = new Window('main');

function main() {
    window.oncontextmenu = event => event.preventDefault();

    const client = new NovaFlightClient();
    client.startClient()
        .then(() => client.scheduleStop())
        .then(() => mainWindow.close());
}

main();
