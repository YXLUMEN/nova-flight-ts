import {Identifier} from "../../registry/Identifier.ts";
import {Registry} from "../../registry/Registry.ts";
import {EMCStatus} from "./EMCStatus.ts";
import {BurningEffect} from "./BurningEffect.ts";
import {StatusEffect} from "./StatusEffect.ts";
import {Registries} from "../../registry/Registries.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {InstantHealthEffect} from "./InstantHealthEffect.ts";
import {ShieldStatusEffect} from "./ShieldStatusEffect.ts";

export class StatusEffects {
    public static readonly SPEED = this.register("speed",
        new StatusEffect(0, '#73c4ff')
            .addAttributeModifier(
                EntityAttributes.GENERIC_MOVEMENT_SPEED, Identifier.ofVanilla("effect.speed"), 0.2)
    );

    public static readonly SLOWNESS = this.register("slowness",
        new StatusEffect(1, '#555555')
            .addAttributeModifier(EntityAttributes.GENERIC_MOVEMENT_SPEED, Identifier.ofVanilla("effect.slowness"), -0.2)
    );

    public static readonly EMC_STATUS = this.register("emc_status",
        new EMCStatus()
            .addAttributeModifier(EntityAttributes.GENERIC_MOVEMENT_SPEED, Identifier.ofVanilla("effect.emc_status"), -0.8)
    );

    public static readonly BURNING = this.register("burning_status",
        new BurningEffect(1)
    );

    public static readonly HEALTH_BOOST = this.register("health_boost",
        new StatusEffect(0, '#ff3333')
            .addAttributeModifier(EntityAttributes.GENERIC_MAX_HEALTH, Identifier.ofVanilla("effect.health_boost"), 4)
    );

    public static readonly INSTANT_HEALTH = this.register("instant_health",
        new InstantHealthEffect()
    );

    public static readonly SHIELD = this.register("shield",
        new ShieldStatusEffect(0, '#5095ff')
            .addAttributeModifier(
                EntityAttributes.GENERIC_MAX_SHIELD, Identifier.ofVanilla("effect.shield"), 4)
    );

    public static readonly RESISTANCE = this.register("resistance", new StatusEffect(0, '#ffc23f'));

    private static register(id: string, statusEffect: StatusEffect): RegistryEntry<StatusEffect> {
        return Registry.registerReferenceById(Registries.STATUS_EFFECT, Identifier.ofVanilla(id), statusEffect);
    }
}