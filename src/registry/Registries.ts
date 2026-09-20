import {RegistryKey} from "./RegistryKey.ts";
import {Registry} from "./Registry.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";

export class Registries {
    private static readonly ROOT = new Registry(RegistryKey.ofRegistry(Identifier.ROOT));

    public static readonly DAMAGE_TYPE = this.simpleCreate(RegistryKeys.DAMAGE_TYPE);
    public static readonly STATUS_EFFECT = this.simpleCreate(RegistryKeys.STATUS_EFFECT);
    public static readonly ENTITY_TYPE = this.simpleCreate(RegistryKeys.ENTITY_TYPE);
    public static readonly ATTRIBUTE = this.simpleCreate(RegistryKeys.ATTRIBUTE);
    public static readonly SOUND_EVENT = this.simpleCreate(RegistryKeys.SOUND_EVENT);
    public static readonly AUDIOS = this.simpleCreate(RegistryKeys.AUDIOS);
    public static readonly ITEM = this.simpleCreate(RegistryKeys.ITEM);
    public static readonly DATA_COMPONENT_TYPE = this.simpleCreate(RegistryKeys.DATA_COMPONENT_TYPE);
    public static readonly VISUAL_EFFECT_TYPE = this.simpleCreate(RegistryKeys.VISUAL_EFFECT_TYPE);
    public static readonly TECH = this.simpleCreate(RegistryKeys.TECH);
    public static readonly WORLD_EVENT = this.simpleCreate(RegistryKeys.WORLD_EVENT);
    public static readonly BLOCK = this.simpleCreate(RegistryKeys.BLOCK);
    public static readonly RESOURCES = this.simpleCreate(RegistryKeys.RESOURCE);
    public static readonly PARTICLES = this.simpleCreate(RegistryKeys.PARTICLES);

    private static simpleCreate<T>(key: RegistryKey<Registry<T>>): Registry<T> {
        return this.create(key, new Registry(key));
    }

    private static create<T, R extends Registry<T>>(key: RegistryKey<Registry<T>>, registry: R): R {
        this.ROOT.add(key, registry);
        return registry;
    }
}