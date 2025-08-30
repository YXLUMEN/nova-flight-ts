import {Identifier} from "./Identifier.ts";
import {RegistryKey} from "./RegistryKey.ts";
import type {Registry} from "./Registry.ts";
import type {DamageType} from "../entity/damage/DamageType.ts";
import type {EntityType} from "../entity/EntityType.ts";
import type {StatusEffect} from "../entity/effect/StatusEffect.ts";
import type {EntityAttribute} from "../entity/attribute/EntityAttribute.ts";

export class RegistryKeys {
    public static readonly DAMAGE_TYPE: RegistryKey<Registry<DamageType>> = this.of("damage_type");
    public static readonly STATUS_EFFECT: RegistryKey<Registry<StatusEffect>> = this.of("status_effect");
    public static readonly ENTITY_TYPE: RegistryKey<Registry<EntityType<any>>> = this.of("entity_type");
    public static readonly ATTRIBUTE: RegistryKey<Registry<EntityAttribute>> = this.of("attribute");

    private static of<T>(id: string): RegistryKey<T> {
        return RegistryKey.ofRegistry(Identifier.ofVanilla(id));
    }
}
