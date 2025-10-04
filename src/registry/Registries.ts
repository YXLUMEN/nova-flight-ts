import {RegistryKey} from "./RegistryKey.ts";
import {Registry} from "./Registry.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";

export class Registries {
    private static readonly ROOT = new Registry(RegistryKey.ofRegistry(Identifier.ROOT));
    private static readonly DEFAULT_ENTRIES = new Map<Identifier, CallableFunction>();

    public static readonly DAMAGE_TYPE = this.simpleCreate(RegistryKeys.DAMAGE_TYPE, () => {
    });
    public static readonly STATUS_EFFECT = this.simpleCreate(RegistryKeys.STATUS_EFFECT, () => {
    });
    public static readonly ENTITY_TYPE = this.simpleCreate(RegistryKeys.ENTITY_TYPE, () => {
    });
    public static readonly ATTRIBUTE = this.simpleCreate(RegistryKeys.ATTRIBUTE, () => {
    });
    public static readonly SOUND_EVENT = this.simpleCreate(RegistryKeys.SOUND_EVENT, () => {
    });
    public static readonly AUDIOS = this.simpleCreate(RegistryKeys.AUDIOS, () => {
    });
    public static readonly GAME_EVENT = this.simpleCreate(RegistryKeys.GAME_EVENT, () => {
    });
    public static readonly ITEM = this.simpleCreate(RegistryKeys.ITEM, () => {
    });
    public static readonly DATA_COMPONENT_TYPE = this.simpleCreate(RegistryKeys.DATA_COMPONENT_TYPE, () => {
    });

    public static async complete() {
        const attr = await import('../entity/attribute/EntityAttributes.ts');
        this.DEFAULT_ENTRIES.set(RegistryKeys.ATTRIBUTE.getValue(), attr.EntityAttributes.registerAndGetDefault);
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