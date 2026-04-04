import type {Item} from "../../../item/Item.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {Identifier} from "../../../registry/Identifier.ts";
import type {Tech} from "../../../world/tech/Tech.ts";

export class TextureMapping {
    public static layer0(item: Item): Identifier {
        return this.getItemTexture(item);
    }

    public static getItemTexture(item: Item) {
        const id = Registries.ITEM.getId(item)!;
        return id.withPrefix('item/');
    }

    public static getTechTexture(tech: Tech) {
        const id = Registries.TECH.getId(tech)!;
        return id.withPrefix('tech/');
    }
}