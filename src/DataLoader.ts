import {RegistryManager} from "./registry/RegistryManager.ts";
import {RegistryKeys} from "./registry/RegistryKeys.ts";
import {SoundSystem} from "./sound/SoundSystem.ts";
import {Identifier} from "./registry/Identifier.ts";

export class DataLoader {
    private static readonly DATA_MAP = new Map<string, any>();

    public static async init(url = '', manager: RegistryManager) {
        const resp = await fetch('/nova-flight/data/tech-data.json');
        const techs = await resp.json();
        this.DATA_MAP.set('tech-data', techs);
        await this.loadSounds(url, manager);
    }

    private static async loadSounds(url: string, manager: RegistryManager): Promise<any> {
        const soundRegister = manager.get(RegistryKeys.SOUND_EVENT);

        const soundJson = await fetch(`${url}/nova-flight/sounds.json`);
        const json = await soundJson.json();
        const soundsJson = Object.entries(json);

        const tasks: Promise<any>[] = [];
        for (const soundData of soundsJson) {
            try {
                const id = soundData[0];
                const sounds = (soundData[1] as any).sounds as string;
                const ide = Identifier.ofVanilla(id);

                if (!soundRegister.getById(ide)) continue;
                const soundPath = sounds.split(':').pop();
                if (!soundPath) continue;

                tasks.push(SoundSystem.loadStatic(ide, soundPath, url));
            } catch (error) {
                console.warn(error);
            }
        }

        await Promise.all(tasks);
    }

    public static get(dataName: string): any {
        return this.DATA_MAP.get(dataName);
    }
}