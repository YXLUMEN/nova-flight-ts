import {Window} from "@tauri-apps/api/window";
import {isDev} from "./configs/WorldConfig.ts";
import {InnerServer} from "./server/InnerServer.ts";
import {DevServer} from "./server/DevServer.ts";

export const mainWindow = new Window('main');

function main() {
    window.oncontextmenu = event => event.preventDefault();
    const ctrl = new AbortController();
    window.addEventListener('keydown', event => event.preventDefault(), {signal: ctrl.signal});

    if (!isDev) {
        mainWindow.setFullscreen(true)
            .then(() => InnerServer.runServer())
            .then(() => ctrl.abort());
        return;
    }
    DevServer.runServer().then(() => {
        const date = new Date();
        const time = date.toLocaleString('zh-CN', {timeZone: 'Asia/ShangHai'});
        ctrl.abort();
        console.log('Game started', time);
    });
}

main();