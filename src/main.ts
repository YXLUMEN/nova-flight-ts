import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";
import {Window} from "@tauri-apps/api/window";

export const mainWindow = new Window('main');

async function main() {
    const manager = new RegistryManager();
    manager.registerAll();
    EntityRenderers.init();

    await DataLoader.init(manager);

    const world = World.createWorld(manager);
    world.start();
}

main().then();