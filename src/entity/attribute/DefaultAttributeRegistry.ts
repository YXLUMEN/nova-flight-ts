import {DefaultAttributeContainer} from "./DefaultAttributeContainer.ts";
import type {EntityType} from "../EntityType.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class DefaultAttributeRegistry {
    private static readonly DEFAULT_ATTRIBUTE_REGISTRY = new Map<EntityType<LivingEntity>, DefaultAttributeContainer>();

    public static get(type: EntityType<LivingEntity>): DefaultAttributeContainer | undefined {
        return this.DEFAULT_ATTRIBUTE_REGISTRY.get(type);
    }

    public static set(type: EntityType<LivingEntity>, attr: DefaultAttributeContainer) {
        this.DEFAULT_ATTRIBUTE_REGISTRY.set(type, attr);
    }
}
