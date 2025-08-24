import {Identifier} from "./Identifier.ts";
import {RegistryKey} from "./RegistryKey.ts";
import type {Registry} from "./Registry.ts";
import type {DamageType} from "../entity/damage/DamageType.ts";
import type {StatusEffect} from "../status/StatusEffect.ts";

export class RegistryKeys {
    public static readonly DAMAGE_TYPE: RegistryKey<Registry<DamageType>> = RegistryKeys.of("damage_type");
    public static readonly STATUS_EFFECT: RegistryKey<Registry<StatusEffect>> = RegistryKeys.of("status_effect");

    private static of<T>(id: string): RegistryKey<T> {
        return RegistryKey.ofRegistry(Identifier.ofVanilla(id));
    }
}
