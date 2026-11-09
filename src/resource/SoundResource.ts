import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import type {HashMap} from "../utils/collection/HashMap.ts";
import {join, resolveResource} from "@tauri-apps/api/path";
import {readFile, readTextFile} from "@tauri-apps/plugin-fs";
import {deepFreeze, isRecord} from "../utils/util.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Resources} from "./Resources.ts";
import {WrapperMap} from "../utils/collection/WrapperMap.ts";
import {Log} from "../worker/log.ts";

export class SoundResource implements ResourceModule {
    public readonly buffers: HashMap<Identifier, AudioBuffer[]> = new WrapperMap();

    public getId(): Identifier {
        return Resources.SOUND;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const soundRegister = manager.get(RegistryKeys.SOUND_EVENT);
        const sounds = soundRegister.getIdSet();

        const soundJson = await resolveResource('resources/nova-flight/sounds.json');
        const record: Record<string, any> = JSON.parse(await readTextFile(soundJson));
        const audioContext = new AudioContext();

        if (!isRecord(record)) {
            Log.warn('[Client] No sounds.json was found');
            return;
        }

        const pool = new PromisePool<void>(16);
        const buffersMap = new Map<Identifier, AudioBuffer[]>();
        const root = await resolveResource('resources/nova-flight/sounds');

        const job = async (buffers: AudioBuffer[], soundPath: string) => {
            const buffer = await this.decodeAudios(root, soundPath, audioContext);
            if (buffer) buffers.push(buffer);
        };

        for (const soundId of sounds) {
            try {
                const id = soundId.getPath();
                const entry = record[id];
                if (!entry) {
                    Log.warn(`SoundID "${id}" not found in sounds.json`);
                    continue;
                }

                const sounds: unknown = entry.sounds;
                if (!Array.isArray(sounds) || !sounds.every(value => typeof value === 'string')) {
                    Log.warn(`SoundID ${id} has invalid sounds format (must be array)`);
                    continue;
                }

                const buffers: AudioBuffer[] = [];
                buffersMap.set(soundId, buffers);

                for (const soundEntry of sounds) {
                    const soundPath = soundEntry.split(':').pop();
                    if (soundPath) pool.spawn(job, buffers, soundPath);
                }
            } catch (error) {
                Log.warn(error);
            }
        }

        await pool.join();

        for (const [id, buffers] of buffersMap) {
            if (buffers.length > 0) this.buffers.set(id, buffers);
        }

        await audioContext.close();
        deepFreeze(this.buffers);
    }

    private async decodeAudios(root: string, filename: string, audioContext: AudioContext): Promise<AudioBuffer | null> {
        try {
            const path = await join(root, `${filename}.ogg`);
            const fileData = await readFile(path);
            return await audioContext.decodeAudioData(fileData.buffer);
        } catch (err) {
            const msg = `Failed to load sound: ${filename}, cause by:\n  ${err}`;
            Log.warn(msg);
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