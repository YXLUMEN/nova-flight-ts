import {Identifier} from "./Identifier.ts";
import {RegistryKey} from "./RegistryKey.ts";
import type {Registry} from "./Registry.ts";
import type {DamageType} from "../entity/damage/DamageType.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {StatusEffect} from "../entity/effect/StatusEffect.ts";

export class RegistryKeys {
    public static readonly DAMAGE_TYPE: RegistryKey<Registry<DamageType>> = RegistryKeys.of("damage_type");
    public static readonly STATUS_EFFECT: RegistryKey<Registry<StatusEffect>> = RegistryKeys.of("status_effect");
    public static readonly ENTITY_TYPE: RegistryKey<Registry<EntityType<any>>> = RegistryKeys.of("entity_type");

    private static of<T>(id: string): RegistryKey<T> {
        return RegistryKey.ofRegistry(Identifier.ofVanilla(id));
    }
}
