import {RegistryManager} from "./registry/RegistryManager.ts";
import {SoundSystem} from "./sound/SoundSystem.ts";
import {AudioManager} from "./sound/AudioManager.ts";

export class DataLoader {
    public static async init(manager: RegistryManager) {
        await SoundSystem.loadSounds(manager);
        await AudioManager.loadFiles(manager);
    }
}