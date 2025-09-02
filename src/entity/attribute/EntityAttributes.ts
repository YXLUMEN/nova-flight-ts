import type {EntityAttribute} from "./EntityAttribute.ts";
import {Registry} from "../../registry/Registry.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {ClampedEntityAttribute} from "./ClampedEntityAttribute.ts";

export class EntityAttributes {
    public static readonly GENERIC_MAX_HEALTH = this.register('generic.max_health',
        new ClampedEntityAttribute(1, 1, 1024)
    );
    public static readonly GENERIC_ATTACK_DAMAGE = this.register('generic.attack_damage',
        new ClampedEntityAttribute(1, 0, 2048)
    );
    public static readonly GENERIC_MOVEMENT_SPEED = this.register('generic.speed',
        new ClampedEntityAttribute(1, 0, 256)
    );

    public static registerAndGetDefault(_registry: Registry<EntityAttribute>) {
        return this.GENERIC_MAX_HEALTH;
    }

    private static register(id: string, attribute: EntityAttribute) {
        return Registry.registerReferenceById(Registries.ATTRIBUTE, Identifier.ofVanilla(id), attribute);
    }
}