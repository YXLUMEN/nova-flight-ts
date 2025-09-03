import type {SoundEvent} from "./SoundEvent.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import {Identifier} from "../registry/Identifier.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readFile, readTextFile} from "@tauri-apps/plugin-fs";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";

export class SoundSystem {
    private static audioContext = new AudioContext();
    private static readonly loadedSounds = new HashMap<Identifier, AudioBuffer>();

    public static async loadSounds(manager: RegistryManager): Promise<any> {
        const soundRegister = manager.get(RegistryKeys.SOUND_EVENT);
        const sounds = soundRegister.getIds();

        const soundJson = await resolveResource('resources/nova-flight/sounds.json');
        const json = JSON.parse(await readTextFile(soundJson));
        for (const soundId of sounds) {
            try {
                const id = soundId.getPath();
                const col = json[id];
                if (!col) {
                    console.warn(`SoundID ${id} not found in sounds.json`);
                    continue;
                }
                const soundPath = (col.sounds as string).split(':').pop();
                if (!soundPath) continue;

                await SoundSystem.loadStatic(soundId, soundPath);
            } catch (error) {
                console.warn(error);
            }
        }
    }

    public static async loadStatic(id: Identifier, path: string): Promise<void> {
        const res = await resolveResource(`resources/nova-flight/sounds/${path}.wav`);
        const buffer = await readFile(res);
        const audioBuffer = await this.audioContext.decodeAudioData(buffer.buffer);
        this.loadedSounds.set(id, audioBuffer);
    }

    public static playSound(event: SoundEvent): void {
        const buffer = this.loadedSounds.get(event.getId());
        if (!buffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.start(0);
    }
}