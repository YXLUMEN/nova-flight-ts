import {Window} from "@tauri-apps/api/window";
import {isServer} from "./configs/WorldConfig.ts";
import {run} from "./lib.ts";

export const mainWindow = new Window('main');

function main() {
    if (isServer) return;
    run();
}

main();
