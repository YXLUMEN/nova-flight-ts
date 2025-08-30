import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";
import {DataLoader} from "./DataLoader.ts";


async function main() {
    await DataLoader.init();
    const manager = new RegistryManager();
    manager.registerAll();

    EntityRenderers.init();
    World.createWorld(manager);
}

main().catch(console.error);