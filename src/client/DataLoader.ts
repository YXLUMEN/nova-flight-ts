import {RegistryManager} from "../registry/RegistryManager.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {LangManager} from "../i18n/LangManager.ts";

export class DataLoader {
    public static async init(manager: RegistryManager) {
        await LangManager.loadLang('zh_cn');
        await SoundSystem.loadSounds(manager);
        await AudioManager.loadFiles(manager);
    }
}