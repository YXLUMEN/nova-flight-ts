import {World} from "./World.ts";
import {RegistryManager} from "./registry/RegistryManager.ts";

const manager = new RegistryManager();
manager.registerAll();
World.instance = new World(manager);