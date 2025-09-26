import type {Identifier} from "../registry/Identifier.ts";
import {clamp} from "../utils/math/math.ts";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {resolveResource} from "@tauri-apps/api/path";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {SoundEvent} from "./SoundEvent.ts";
import {convertFileSrc} from "@tauri-apps/api/core";

export class AudioManager {
    private static readonly AUDIO_PLAYER = new Audio();
    private static readonly audioMap = new Map<Identifier, string>();
    private static readonly eventMap = new Map<string, AbortController>();

    public static async loadFiles(manager: RegistryManager): Promise<void> {
        const audioRegister = manager.get(RegistryKeys.AUDIOS);
        const audios = audioRegister.getIds();

        const jsonPath = await resolveResource(`resources/nova-flight/audios.json`);
        const json = JSON.parse(await readTextFile(jsonPath));

        for (const audioId of audios) {
            try {
                const id = audioId.getPath();
                const entry = json[id];
                const audioEntry = entry['file'];

                if (!entry || !audioEntry) {
                    console.warn(`AudioID ${id} not found in audios.json`);
                    continue;
                }

                const audioPath = audioEntry.split(':').pop();
                if (!audioPath) continue;

                const url = await resolveResource(`resources/nova-flight/audios${audioPath}`);
                this.audioMap.set(audioId, convertFileSrc(url));
            } catch (err) {
                console.warn(err);
            }
        }
    }

    public static playAudio(event: SoundEvent, loop = false) {
        const id = event.getId();
        const url = this.audioMap.get(id);
        if (!url) {
            console.warn(`Can't find sound with id: ${id}`);
            return;
        }

        const player = this.AUDIO_PLAYER;
        player.src = url;
        player.loop = loop;
        player.play().catch(console.error);
    }

    public static randomPlay(...event: SoundEvent[]) {
        this.playAudio(event[Math.floor(Math.random() * event.length)]);
    }

    public static leap(time: number) {
        this.AUDIO_PLAYER.currentTime = time;
    }

    public static pause(): void {
        this.AUDIO_PLAYER.pause();
    }

    public static resume(): void {
        if (this.AUDIO_PLAYER.src) this.AUDIO_PLAYER.play().then();
    }

    public static stop(): void {
        this.AUDIO_PLAYER.pause();
        this.AUDIO_PLAYER.src = '';
    }

    public static reset(): void {
        this.AUDIO_PLAYER.pause();
        this.AUDIO_PLAYER.currentTime = 0;
    }

    public static setVolume(volume: number): void {
        this.AUDIO_PLAYER.volume = clamp(volume, 0, 1);
    }

    public static addListener(
        name: string,
        type: keyof HTMLMediaElementEventMap,
        listener: (ev: Event) => void,
        options?: AddEventListenerOptions
    ): AbortController | null {
        if (this.eventMap.has(name)) {
            console.warn(`Already added listener for event ${type} for ${name}`);
            return null;
        }

        const ctrl = new AbortController();
        const opts: AddEventListenerOptions = {
            ...options,
            signal: ctrl.signal
        }

        this.AUDIO_PLAYER.addEventListener(type, listener, opts);
        this.eventMap.set(name, ctrl);

        return ctrl;
    }

    public static setAudio() {
        return this.AUDIO_PLAYER;
    }

    public static removeListener(name: string, reason?: any): void {
        const ctrl = this.eventMap.get(name);
        if (!ctrl) return;

        ctrl.abort(reason);
    }
}