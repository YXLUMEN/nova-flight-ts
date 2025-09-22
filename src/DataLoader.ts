import {RegistryManager} from "./registry/RegistryManager.ts";
import {SoundSystem} from "./sound/SoundSystem.ts";
import {readTextFile,} from "@tauri-apps/plugin-fs";
import {resolveResource} from "@tauri-apps/api/path";
import {AudioManager} from "./sound/AudioManager.ts";

export class DataLoader {
    private static readonly DATA_MAP = new Map<string, any>();

    public static async init(manager: RegistryManager) {
        // 加载科技
        const techDataPath = await resolveResource('resources/nova-flight/data/tech-data.json');
        const techData = JSON.parse(await readTextFile(techDataPath));
        this.DATA_MAP.set('tech-data', techData);

        await SoundSystem.loadSounds(manager);
        await AudioManager.loadFiles(manager);
    }


    public static get(dataName: string): any {
        return this.DATA_MAP.get(dataName);
    }
}