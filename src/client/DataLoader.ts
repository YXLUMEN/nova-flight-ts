import {RegistryManager} from "../registry/RegistryManager.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {LangModule} from "../resource/LangModule.ts";
import {SoundModule} from "../resource/SoundModule.ts";
import {AudioModule} from "../resource/AudioModule.ts";
import {TipResource} from "../resource/TipResource.ts";
import {TextureResource} from "../resource/TextureResource.ts";
import {TipManager} from "./tips/TipManager.ts";
import type {LoadingScreen} from "./render/ui/LoadingScreen.ts";

export class DataLoader {
    public static async registerAndLoad(manager: RegistryManager, loadScreen: LoadingScreen) {
        ResourceManager.register(new LangModule());
        ResourceManager.register(new SoundModule());
        ResourceManager.register(new AudioModule());
        ResourceManager.register(new TipResource());
        ResourceManager.register(new TextureResource());

        await ResourceManager.loadAll(manager, (total, completed, module) => {
            loadScreen.setSubProgress(completed / total, `正在加载 ${module.getId()}`);
        }, 50);
        loadScreen.hideSubBar();

        TipManager.init();
    }
}