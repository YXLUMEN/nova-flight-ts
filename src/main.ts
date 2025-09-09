import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";
import {Window} from "@tauri-apps/api/window";
import {check} from "@tauri-apps/plugin-updater";

export const mainWindow = new Window('main');

async function main() {
    try {
        const update = await check();
        if (update && confirm('发现更新')) {
            alert('开始下载, 请等待');
            await update.downloadAndInstall();
            return;
        }
    } catch (error) {
        console.error(error);
    }

    const manager = new RegistryManager();
    manager.registerAll();
    EntityRenderers.registryRenders();

    await DataLoader.init(manager);

    const world = World.createWorld(manager);
    world.start();
}

main().then();