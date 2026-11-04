import type {ResourceModule} from "./ResourceModule.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {sleep} from "../utils/util.ts";

export class ResourceManager {
    private static readonly modules: Map<Identifier, ResourceModule> = new Map();

    public static register(module: ResourceModule) {
        if (this.modules.has(module.getId())) {
            throw new Error(`Module ${module.getId()} already registered`);
        }
        this.modules.set(module.getId(), module);
    }

    public static get<T extends ResourceModule>(entry: Identifier): T {
        const mod = this.modules.get(entry);
        if (!mod) throw new Error(`Module ${entry} not found`);
        return mod as T;
    }

    public static unload(entry: Identifier): boolean {
        const mod = this.modules.get(entry);
        if (!mod) return false;
        try {
            mod.unload();
        } catch (e) {
            console.error(`Error while unloading module ${entry}`);
            return false;
        }

        this.modules.delete(entry);
        return true;
    }

    public static async loadAll(
        manager: RegistryManager,
        callback?: (total: number, completed: number, module: ResourceModule) => void,
        delay: number = 0
    ): Promise<void> {
        let completed = 0;
        const total = this.modules.size;

        for (const [id, module] of this.modules) {
            try {
                await module.load(manager);
            } catch (e) {
                console.error(`Failed to load module ${id}`, e);
            }
            completed++;
            callback?.(total, completed, module);
            if (delay > 0) await sleep(delay);
        }
    }

    public static async reload(manager: RegistryManager, id: Identifier) {
        const mod = this.modules.get(id);
        if (!mod) throw new Error(`Module ${id} not found`);
        try {
            await mod.reload(manager);
        } catch (e) {
            console.error(`Failed to load module ${id}`, e);
        }
    }

    public static unloadAll() {
        for (const entry of this.modules.keys()) {
            this.unload(entry);
        }
    }
}