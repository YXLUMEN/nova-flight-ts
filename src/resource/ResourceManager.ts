import type {ResourceModule} from "./ResourceModule.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {sleep} from "../utils/uit.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";

export class ResourceManager {
    private static readonly modules = new Map<RegistryEntry<string>, ResourceModule>();

    public static register(module: ResourceModule) {
        if (this.modules.has(module.getId())) {
            throw new Error(`Module ${module.getId()} already registered`);
        }
        this.modules.set(module.getId(), module);
    }

    public static get<T extends ResourceModule>(entry: RegistryEntry<string>): T {
        const mod = this.modules.get(entry);
        if (!mod) throw new Error(`Module ${entry.getValue()} not found`);
        return mod as T;
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

    public static async unloadAll() {
        for (const module of this.modules.values()) {
            module.unload();
        }
    }
}