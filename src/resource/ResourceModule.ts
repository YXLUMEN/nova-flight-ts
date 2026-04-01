import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";

export interface ResourceModule {
    getId(): RegistryEntry<string>;

    load(manager: RegistryManager): Promise<void>;

    reload(manager: RegistryManager): Promise<void>;

    unload(): void;
}