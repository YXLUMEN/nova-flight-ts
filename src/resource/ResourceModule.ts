import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {Identifier} from "../registry/Identifier.ts";

export interface ResourceModule {
    getId(): Identifier;

    load(manager: RegistryManager): Promise<void>;

    reload(manager: RegistryManager): Promise<void>;

    unload(): void;

    requires?(): Identifier[];
}