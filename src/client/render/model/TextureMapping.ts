import {Registries} from "../../../registry/Registries.ts";
import type {Item} from "../../../item/Item.ts";
import type {Tech} from "../../../world/tech/Tech.ts";
import type {EntityType} from "../../../entity/EntityType.ts";

export class TextureMapping {
    public static getItemTexture(item: Item) {
        const id = Registries.ITEM.getId(item)!;
        return id.withPrefix('item/');
    }

    public static getTechTexture(tech: Tech) {
        const id = Registries.TECH.getId(tech)!;
        return id.withPrefix('tech/');
    }

    public static getEntityTexture(type: EntityType<any>) {
        const id = Registries.ENTITY_TYPE.getId(type)!;
        return id.withPrefix('entity/');
    }
}