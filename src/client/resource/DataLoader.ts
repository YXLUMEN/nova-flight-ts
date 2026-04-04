import {RegistryManager} from "../../registry/RegistryManager.ts";
import {ResourceManager} from "./ResourceManager.ts";
import {LangResource} from "./LangResource.ts";
import {SoundResource} from "./SoundResource.ts";
import {AudioResource} from "./AudioResource.ts";
import {TipResource} from "./TipResource.ts";
import {TextureResource} from "./TextureResource.ts";
import type {LoadingScreen} from "../render/ui/LoadingScreen.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {ModelResource} from "./ModelResource.ts";
import {Resources} from "./Resources.ts";
import {sleep} from "../../utils/uit.ts";

export class DataLoader {
    private static loading = false;

    public static async registerAndLoad(manager: RegistryManager, loadScreen: LoadingScreen) {
        if (this.loading) return;
        this.loading = true;

        ResourceManager.register(new LangResource());
        ResourceManager.register(new SoundResource());
        ResourceManager.register(new AudioResource());
        ResourceManager.register(new TipResource());
        ResourceManager.register(new TextureResource());
        ResourceManager.register(new ModelResource());

        const consumer = (total: number, completed: number, module: ResourceModule) => {
            loadScreen.setSubProgress(completed / total, `Loading ${module.getId()}`);
        };

        await ResourceManager.loadAll(manager, consumer, 50);
        loadScreen.hideSubBar();
        this.loading = false;
    }

    public static unloadAll() {
        ResourceManager.unloadAll();
    }

    public static unload(entry: RegistryEntry<string>) {
        ResourceManager.unload(entry);
    }

    public static async reloadModel(manager: RegistryManager) {
        if (this.loading) return;
        this.loading = true;

        await ResourceManager.reload(manager, Resources.TEXTURE);
        await ResourceManager.reload(manager, Resources.MODEL);
        await sleep(50);
        this.loading = false;
    }
}