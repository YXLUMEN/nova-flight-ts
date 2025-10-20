import {Identifier} from "./Identifier.ts";
import {RegistryKey} from "./RegistryKey.ts";
import type {Registry} from "./Registry.ts";
import type {DamageType} from "../entity/damage/DamageType.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {StatusEffect} from "../entity/effect/StatusEffect.ts";
import type {EntityAttribute} from "../entity/attribute/EntityAttribute.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import type {GameEvent} from "../event/GameEvent.ts";
import type {Item} from "../item/Item.ts";
import type {ComponentType} from "../component/ComponentType.ts";
import type {VisualEffectType} from "../effect/VisualEffectType.ts";

export class RegistryKeys {
    public static readonly DAMAGE_TYPE: RegistryKey<Registry<DamageType>> = this.of("damage_type");
    public static readonly STATUS_EFFECT: RegistryKey<Registry<StatusEffect>> = this.of("status_effect");
    public static readonly ENTITY_TYPE: RegistryKey<Registry<EntityType<any>>> = this.of("entity_type");
    public static readonly ATTRIBUTE: RegistryKey<Registry<EntityAttribute>> = this.of("attribute");
    public static readonly SOUND_EVENT: RegistryKey<Registry<SoundEvent>> = this.of("sound_event");
    public static readonly AUDIOS: RegistryKey<Registry<SoundEvent>> = this.of("audios");
    public static readonly GAME_EVENT: RegistryKey<Registry<GameEvent>> = this.of("game_event");
    public static readonly ITEM: RegistryKey<Registry<Item>> = this.of("item");
    public static readonly DATA_COMPONENT_TYPE: RegistryKey<Registry<ComponentType<any>>> = this.of("data_component_type");
    public static readonly EFFECT_TYPE: RegistryKey<Registry<VisualEffectType<any>>> = this.of("effect");

    private static of<T>(id: string): RegistryKey<T> {
        return RegistryKey.ofRegistry(Identifier.ofVanilla(id));
    }
}
