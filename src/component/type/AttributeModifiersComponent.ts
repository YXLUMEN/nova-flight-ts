import type {EntityAttributeModifier} from "../../entity/attribute/EntityAttributeModifier.ts";
import {Identifier} from "../../registry/Identifier.ts";

export class AttributeModifiersComponent implements EntityAttributeModifier {
    public static readonly DEFAULT = new AttributeModifiersComponent(
        Identifier.ofVanilla('default_attribute_component'),
        0
    );
    public id: Identifier;
    public value: number;

    public constructor(id: Identifier, value: number) {
        this.id = id;
        this.value = value;
    }
}