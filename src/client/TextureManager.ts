import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {Item} from "../item/Item.ts";
import type {TextureResource} from "../resource/TextureResource.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";

export class TextureManager {
    private static cache: TextureResource | null = null;

    private static get module() {
        if (!this.cache) this.cache = ResourceManager.get<TextureResource>(Resources.TEXTURE);
        return this.cache;
    }

    public static getModel(entry: RegistryEntry<Item>): ImageBitmap {
        return this.module.get(entry);
    }
}