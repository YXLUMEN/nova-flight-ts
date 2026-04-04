import type {RegistryManager} from "../../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {RegistryKeys} from "../../registry/RegistryKeys.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readFile, readTextFile} from "@tauri-apps/plugin-fs";
import {PromisePool} from "../../utils/collection/PromisePool.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {deepFreeze} from "../../utils/uit.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import {warn} from "@tauri-apps/plugin-log";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";

export class SoundResource implements ResourceModule {
    public readonly buffers = new HashMap<Identifier, AudioBuffer[]>();

    public getId(): RegistryEntry<string> {
        return Resources.SOUND;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const soundRegister = manager.get(RegistryKeys.SOUND_EVENT);
        const sounds = soundRegister.getIdSet();

        const soundJson = await resolveResource('resources/nova-flight/sounds.json');
        const json = JSON.parse(await readTextFile(soundJson));
        const audioContext = new AudioContext();

        const pool = new PromisePool();
        const loadTasks: Promise<void>[] = [];
        const buffersMap = new Map<Identifier, AudioBuffer[]>();

        for (const soundId of sounds) {
            try {
                const id = soundId.getPath();
                const entry = json[id];
                if (!entry) {
                    await warn(`SoundID ${id} not found in sounds.json`);
                    continue;
                }

                const sounds = entry.sounds;
                if (!Array.isArray(sounds) || !sounds.every(value => typeof value === 'string')) {
                    await warn(`SoundID ${id} has invalid sounds format (must be array)`);
                    continue;
                }

                const buffers: AudioBuffer[] = [];
                buffersMap.set(soundId, buffers);

                for (const soundEntry of sounds) {
                    const soundPath = soundEntry.split(':').pop();
                    if (!soundPath) continue;

                    loadTasks.push(pool.submit(async () => {
                        const buffer = await this.decodeAudios(soundPath, audioContext);
                        if (buffer) buffers.push(buffer);
                    }));
                }
            } catch (error) {
                await warn(String(error));
            }
        }

        await Promise.all(loadTasks);

        for (const [id, buffers] of buffersMap) {
            if (buffers.length > 0) this.buffers.set(id, buffers);
        }

        await audioContext.close();
        deepFreeze(this.buffers);
    }

    private async decodeAudios(path: string, audioContext: AudioContext): Promise<AudioBuffer | null> {
        try {
            const res = await resolveResource(`resources/nova-flight/sounds/${path}.wav`);
            const fileData = await readFile(res);
            return await audioContext.decodeAudioData(fileData.buffer);
        } catch (e) {
            console.warn(`Failed to load sound: ${path}`, e);
            return null;
        }
    }

    public reload(manager: RegistryManager): Promise<void> {
        this.unload();
        return this.load(manager);
    }

    public unload(): void {
        this.buffers.clear();
    }
}