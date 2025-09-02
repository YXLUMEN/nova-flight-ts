import {RegistryKey} from "./RegistryKey.ts";
import {Registry} from "./Registry.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";
import {EntityAttributes} from "../entity/attribute/EntityAttributes.ts";

export class Registries {
    private static readonly ROOT = new Registry(RegistryKey.ofRegistry(Identifier.ROOT));
    private static readonly DEFAULT_ENTRIES = new Map<Identifier, CallableFunction>();

    public static readonly STATUS_EFFECT = this.simpleCreate(RegistryKeys.STATUS_EFFECT, () => {
    });
    public static readonly ENTITY_TYPE = this.simpleCreate(RegistryKeys.ENTITY_TYPE, () => {
    });
    public static readonly ATTRIBUTE = this.simpleCreate(RegistryKeys.ATTRIBUTE, () => {
    });
    public static readonly SOUND_EVENT = this.simpleCreate(RegistryKeys.SOUND_EVENT, () => {
    });

    public static complete() {
        this.DEFAULT_ENTRIES.set(RegistryKeys.ATTRIBUTE.getValue(), EntityAttributes.registerAndGetDefault);
        Object.freeze(this);
    }

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