import {AttributeSupplier} from "./AttributeSupplier.ts";
import type {EntityType} from "../EntityType.ts";
import type {LivingEntity} from "../LivingEntity.ts";

export class DefaultAttributeRegistry {
    private static readonly DEFAULT_ATTRIBUTE_REGISTRY = new Map<EntityType<LivingEntity>, AttributeSupplier>();

    public static get(type: EntityType<LivingEntity>): AttributeSupplier | undefined {
        return this.DEFAULT_ATTRIBUTE_REGISTRY.get(type);
    }

    public static set(type: EntityType<LivingEntity>, attr: AttributeSupplier) {
        this.DEFAULT_ATTRIBUTE_REGISTRY.set(type, attr);
    }
}
