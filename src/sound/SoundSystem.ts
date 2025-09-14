import type {SoundEvent} from "./SoundEvent.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import {Identifier} from "../registry/Identifier.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readFile, readTextFile} from "@tauri-apps/plugin-fs";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {clamp} from "../utils/math/math.ts";

// noinspection DuplicatedCode
export class SoundSystem {
    private static audioContext = new AudioContext();
    private static gainNode = this.audioContext.createGain();
    private static readonly loadedSounds = new HashMap<Identifier, AudioBuffer[]>();
    private static readonly activeLoops = new HashMap<Identifier, AudioBufferSourceNode>();

    static {
        this.gainNode.connect(this.audioContext.destination);
    }

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
                if (!Array.isArray(col.sounds)) {
                    console.warn(`SoundID ${id} has invalid sounds format (must be array)`);
                    continue;
                }

                const buffers: AudioBuffer[] = [];
                for (const soundEntry of col.sounds) {
                    const soundPath = soundEntry.split(':').pop();
                    if (!soundPath) continue;
                    const buffer = await this.loadStatic(soundPath);
                    if (buffer) buffers.push(buffer);
                }

                if (buffers.length > 0) {
                    this.loadedSounds.set(soundId, buffers);
                }
            } catch (error) {
                console.warn(error);
            }
        }
    }

    public static async loadStatic(path: string): Promise<AudioBuffer | null> {
        try {
            const res = await resolveResource(`resources/nova-flight/sounds/${path}.wav`);
            const fileData = await readFile(res);
            return await this.audioContext.decodeAudioData(fileData.buffer);
        } catch (e) {
            console.warn(`Failed to load sound: ${path}`, e);
            return null;
        }
    }

    public static playSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        const buffers = this.loadedSounds.get(event.getId());
        if (!buffers || buffers.length === 0) return;

        const buffer = buffers[(Math.random() * buffers.length) | 0];

        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = pitch;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = clamp(volume, 0, 1);

        source.connect(gainNode);
        gainNode.connect(this.gainNode);
        source.start(0);
    }

    public static playLoopSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        const key = event.getId();
        if (this.activeLoops.has(key)) return;

        const buffers = this.loadedSounds.get(event.getId());
        if (!buffers || buffers.length === 0) return;

        const buffer = buffers[(Math.random() * buffers.length) | 0];
        const source = this.audioContext.createBufferSource();

        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = pitch;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = clamp(volume, 0, 1);

        source.connect(gainNode);
        gainNode.connect(this.gainNode);

        source.start(0);

        this.activeLoops.set(key, source);
    }

    public static stopLoopSound(event: SoundEvent): boolean {
        const key = event.getId();
        const source = this.activeLoops.get(key);
        if (source) {
            source.stop();
            this.activeLoops.delete(key);
            return true;
        }
        return false;
    }

    public static pauseAll(): Promise<void> {
        return this.audioContext.suspend();
    }

    public static resumeAll(): Promise<void> {
        return this.audioContext.resume();
    }
}