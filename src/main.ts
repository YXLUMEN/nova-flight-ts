import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";
import {Window} from "@tauri-apps/api/window";
import {check} from "@tauri-apps/plugin-updater";
import {isDev} from "./configs/WorldConfig.ts";

export const mainWindow = new Window('main');

async function main() {
    try {
        if (!isDev) {
            const update = await check();
            if (update && confirm('发现更新')) {
                alert('开始下载, 请等待');
                await update.downloadAndInstall();
                return;
            }
        }
    } catch (error) {
        console.error(error);
    }

    const manager = new RegistryManager();
    await manager.registerAll();
    EntityRenderers.registryRenders();

    await DataLoader.init(manager);

    const world = World.createWorld(manager);
    if (!isDev) await mainWindow.setFullscreen(true);

    world.start();
}

main().then();