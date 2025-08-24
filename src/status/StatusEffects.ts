import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {EMCStatus} from "./EMCStatus.ts";
import {BurningEffect} from "./BurningEffect.ts";
import {StatusEffect} from "./StatusEffect.ts";
import {Registries} from "../registry/Registries.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";

export class StatusEffects {
    public static readonly EMCStatus = this.register(
        "emc_status", new EMCStatus()
    );

    public static readonly BurningStatus = this.register(
        "burning_status", new BurningEffect(0.5)
    );

    private static register(id: string, statusEffect: StatusEffect): RegistryEntry<StatusEffect> {
        return Registry.registerReferenceById(Registries.STATUS_EFFECT, Identifier.ofVanilla(id), statusEffect);
    }
}