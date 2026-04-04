import type {DisplayConfig} from "./DisplayConfig.ts";
import {config} from "../../../utils/uit.ts";
import type {TextureProvider} from "./TextureProvider.ts";

export class Model {
    public static readonly DEFAULT_CONFIG: DisplayConfig = config({
        scale: [1, 1],
        offset: [0, 0],
        rotation: 0
    });

    public readonly provider: TextureProvider;
    public readonly textureKey: string;
    public readonly config: DisplayConfig;

    // public readonly textures: Map<string, string>;

    public constructor(provider: TextureProvider, textureKey: string, config?: DisplayConfig) {
        this.provider = provider;
        this.textureKey = textureKey;
        this.config = config ?? Model.DEFAULT_CONFIG;
    }

    public getLayer0(): ImageBitmap {
        return this.provider.getTexture(this.textureKey);
    }

    public getCovered(): string {
        return this.provider.getCovered(this.textureKey);
    }
}