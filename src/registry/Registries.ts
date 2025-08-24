import {RegistryKey} from "./RegistryKey.ts";
import {Registry} from "./Registry.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";

export class Registries {
    private static readonly ROOT = new Registry(RegistryKey.ofRegistry(Identifier.ROOT));
    private static readonly DEFAULT_ENTRIES = new Map();

    public static readonly STATUS_EFFECT = this.simpleCreate(RegistryKeys.STATUS_EFFECT, () => {
    });

    private static simpleCreate<T>(key: RegistryKey<Registry<T>>, initializer: CallableFunction): Registry<T> {
        return this.create(key, new Registry(key), initializer);
    }

    private static create<T, R extends Registry<T>>(key: RegistryKey<Registry<T>>, registry: R, initializer: CallableFunction): R {
        const id = key.getValue();
        this.DEFAULT_ENTRIES.set(id, initializer);
        this.ROOT.add(key, registry);
        return registry;
    }
}