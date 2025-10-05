import {Window} from "@tauri-apps/api/window";
import {isDev} from "./configs/WorldConfig.ts";
import {InnerServer} from "./server/InnerServer.ts";
import {DevServer} from "./server/DevServer.ts";
import {NovaFlightClient} from "./client/NovaFlightClient.ts";

export const mainWindow = new Window('main');

function main() {
    window.oncontextmenu = event => event.preventDefault();

    NovaFlightClient.startClient();
    if (!isDev) {
        InnerServer.runServer()
            .then(() => mainWindow.setFullscreen(true));
        return;
    }
    DevServer.runServer().then(() => {
        const date = new Date();
        const time = date.toLocaleString('zh-CN', {timeZone: 'Asia/ShangHai'});
        console.log('Game started', time);
    });
}

main();