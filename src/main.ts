import {Window} from "@tauri-apps/api/window";
import {isDev} from "./configs/WorldConfig.ts";
import {runDevServer} from "./server/DevServer.ts";
import {runInnerServer} from "./server/InnerServer.ts";

export const mainWindow = new Window('main');

function main() {
    if (!isDev) {
        runInnerServer().then();
        return;
    }
    runDevServer().then(() => {
        const date = new Date();
        const time = date.toLocaleString('zh-CN', {timeZone: 'Asia/ShangHai'});
        console.log('Game started', time);
    });
}

main();