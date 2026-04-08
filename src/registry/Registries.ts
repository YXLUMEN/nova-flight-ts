import {RegistryKey} from "./RegistryKey.ts";
import {Registry} from "./Registry.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";

export class Registries {
    private static readonly ROOT = new Registry(RegistryKey.ofRegistry(Identifier.ROOT));
    private static readonly DEFAULT_ENTRIES = new Map<Identifier, CallableFunction>();
    private static readonly EMPTY_INIT = () => {
    };

    public static readonly DAMAGE_TYPE = this.simpleCreate(RegistryKeys.DAMAGE_TYPE, this.EMPTY_INIT);
    public static readonly STATUS_EFFECT = this.simpleCreate(RegistryKeys.STATUS_EFFECT, this.EMPTY_INIT);
    public static readonly ENTITY_TYPE = this.simpleCreate(RegistryKeys.ENTITY_TYPE, this.EMPTY_INIT);
    public static readonly ATTRIBUTE = this.simpleCreate(RegistryKeys.ATTRIBUTE, this.EMPTY_INIT);
    public static readonly SOUND_EVENT = this.simpleCreate(RegistryKeys.SOUND_EVENT, this.EMPTY_INIT);
    public static readonly AUDIOS = this.simpleCreate(RegistryKeys.AUDIOS, this.EMPTY_INIT);
    public static readonly GAME_EVENT = this.simpleCreate(RegistryKeys.GAME_EVENT, this.EMPTY_INIT);
    public static readonly ITEM = this.simpleCreate(RegistryKeys.ITEM, this.EMPTY_INIT);
    public static readonly DATA_COMPONENT_TYPE = this.simpleCreate(RegistryKeys.DATA_COMPONENT_TYPE, this.EMPTY_INIT);
    public static readonly EFFECT_TYPE = this.simpleCreate(RegistryKeys.EFFECT_TYPE, this.EMPTY_INIT);
    public static readonly TECH = this.simpleCreate(RegistryKeys.TECH, this.EMPTY_INIT);
    public static readonly WORLD_EVENT = this.simpleCreate(RegistryKeys.WORLD_EVENT, this.EMPTY_INIT);
    public static readonly BLOCK = this.simpleCreate(RegistryKeys.BLOCK, this.EMPTY_INIT);
    public static readonly RESOURCES = this.simpleCreate(RegistryKeys.RESOURCE, this.EMPTY_INIT);
    public static readonly PARTICLES = this.simpleCreate(RegistryKeys.PARTICLE, this.EMPTY_INIT);

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