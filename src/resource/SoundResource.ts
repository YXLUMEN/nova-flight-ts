import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {exists, readFile, readTextFile} from "@tauri-apps/plugin-fs";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import {Identifier} from "../registry/Identifier.ts";
import {deepFreeze} from "../utils/uit.ts";
import {warn} from "@tauri-apps/plugin-log";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";
import type {HashMap} from "../utils/collection/HashMap.ts";
import {WrapperMap} from "../utils/collection/WrapperMap.ts";

export class SoundResource implements ResourceModule {
    public readonly buffers: HashMap<Identifier, AudioBuffer[]> = new WrapperMap();

    public getId(): RegistryEntry<string> {
        return Resources.SOUND;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const soundRegister = manager.get(RegistryKeys.SOUND_EVENT);
        const sounds = soundRegister.getIdSet();

        const soundJson = await resolveResource('resources/nova-flight/sounds.json');
        const json: unknown = JSON.parse(await readTextFile(soundJson));
        const audioContext = new AudioContext();

        if (!json || typeof json !== 'object') {
            console.warn('[Client] No sound.json was found');
            return;
        }

        const mapped = json as Record<string, any>;
        const pool = new PromisePool();
        const buffersMap = new Map<Identifier, AudioBuffer[]>();

        const job = async (buffers: AudioBuffer[], soundPath: string) => {
            const buffer = await this.decodeAudios(soundPath, audioContext);
            if (buffer) buffers.push(buffer);
        };

        for (const soundId of sounds) {
            try {
                const id = soundId.getPath();
                const entry = mapped[id];
                if (!entry) {
                    await warn(`SoundID ${id} not found in sounds.json`);
                    continue;
                }

                const sounds: unknown = entry.sounds;
                if (!Array.isArray(sounds) || !sounds.every(value => typeof value === 'string')) {
                    await warn(`SoundID ${id} has invalid sounds format (must be array)`);
                    continue;
                }

                const buffers: AudioBuffer[] = [];
                buffersMap.set(soundId, buffers);

                for (const soundEntry of sounds) {
                    const soundPath = soundEntry.split(':').pop();
                    if (!soundPath) continue;

                    pool.spawn(job, buffers, soundPath);
                }
            } catch (error) {
                await warn(String(error));
            }
        }

        await pool.join();

        for (const [id, buffers] of buffersMap) {
            if (buffers.length > 0) this.buffers.set(id, buffers);
        }

        await audioContext.close();
        deepFreeze(this.buffers);
    }

    private async decodeAudios(path: string, audioContext: AudioContext): Promise<AudioBuffer | null> {
        try {
            let res = await resolveResource(`resources/nova-flight/sounds/${path}.ogg`);
            if (!await exists(res)) {
                res = await resolveResource(`resources/nova-flight/sounds/${path}.wav`);
            }

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