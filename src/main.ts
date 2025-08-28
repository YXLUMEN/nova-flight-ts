import {World} from "./world/World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";
import {EntityRenderers} from "./render/entity/EntityRenderers.ts";

const manager = new RegistryManager();
manager.registerAll();
EntityRenderers.init();
World.instance = new World(manager);