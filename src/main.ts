import {Window} from "@tauri-apps/api/window";
import {isServer} from "./configs/GlobalConfig.ts";

export const mainWindow = new Window('main');

function main() {
    if (isServer) return;
    import('./lib.ts').then(mod => mod.run());
}

main();
