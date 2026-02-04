import type {Identifier} from "../registry/Identifier.ts";
import {clamp} from "../utils/math/math.ts";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {resolveResource} from "@tauri-apps/api/path";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {SoundEvent} from "./SoundEvent.ts";
import {convertFileSrc} from "@tauri-apps/api/core";
import {isServer} from "../configs/WorldConfig.ts";
import {MediaWithoutSrc} from "../apis/errors.ts";
import type {Supplier} from "../apis/types.ts";

export class AudioManager {
    private static readonly AUDIO_PLAYER: HTMLAudioElement;

    private static currentPlaying: SoundEvent | null = null;
    private static readonly audioMap = new Map<Identifier, string>();
    private static readonly eventMap = new Map<string, AbortController>();

    static {
        if (!isServer) {
            (this.AUDIO_PLAYER as any) = new Audio();
            this.AUDIO_PLAYER.addEventListener('ended', () => this.currentPlaying = null);
        }
    }

    public static async loadFiles(manager: RegistryManager): Promise<void> {
        const audioRegister = manager.get(RegistryKeys.AUDIOS);
        const audios = audioRegister.getIdSet();

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
                console.warn(err, audioId);
            }
        }
    }

    public static playAudio(event: SoundEvent, loop = false, callback?: Supplier<void>) {
        const id = event.getId();
        const url = this.audioMap.get(id);
        if (!url) {
            console.warn(`Can't find sound with id: ${id}`);
            return;
        }

        this.AUDIO_PLAYER.src = url;
        this.AUDIO_PLAYER.loop = loop;
        this.AUDIO_PLAYER.play()
            .then(callback)
            .catch(console.error);
        this.currentPlaying = event;
    }

    public static randomPlay(...event: SoundEvent[]) {
        this.playAudio(event[Math.floor(Math.random() * event.length)]);
    }

    public static getCurrentPlaying(): SoundEvent | null {
        return this.currentPlaying;
    }

    public static leap(time: number) {
        if (!this.AUDIO_PLAYER.src) throw new MediaWithoutSrc("Audio does not set");
        const duration = this.AUDIO_PLAYER.duration;
        this.AUDIO_PLAYER.currentTime = clamp(time, 0, Number.isFinite(duration) ? duration : 0);
    }

    public static getDuration(): number {
        return this.AUDIO_PLAYER.duration;
    }

    public static pause(): void {
        this.AUDIO_PLAYER.pause();
    }

    public static resume(): void {
        if (this.currentPlaying) {
            this.AUDIO_PLAYER.play().catch(console.error);
        }
    }

    public static stop(event?: SoundEvent): void {
        if (event && this.currentPlaying !== event) return;

        this.AUDIO_PLAYER.pause();
        this.AUDIO_PLAYER.src = '';
        this.currentPlaying = null;
    }

    public static fadeOutAndPause(durationMs: number = 1000): Promise<void> {
        const {promise, resolve} = Promise.withResolvers<void>();
        if (this.AUDIO_PLAYER.paused) {
            resolve();
            return promise;
        }

        const startVolume = this.AUDIO_PLAYER.volume;
        const steps = Math.max(30, Math.floor(durationMs / 16));
        const stepInterval = durationMs / steps;
        let step = 0;

        const fade = () => {
            step++;
            if (step < steps) {
                this.AUDIO_PLAYER.volume = startVolume * startVolume * (1 - step / steps);
                setTimeout(fade, stepInterval);
                return;
            }

            this.AUDIO_PLAYER.volume = 0;
            this.AUDIO_PLAYER.pause();
            this.AUDIO_PLAYER.volume = startVolume;
            resolve();
        }
        fade();

        return promise;
    }

    public static reset(): void {
        this.AUDIO_PLAYER.pause();
        this.AUDIO_PLAYER.currentTime = 0;
    }

    public static setVolume(volume: number): void {
        this.AUDIO_PLAYER.volume = clamp(volume, 0, 1);
    }

    public static getRemainingTime(): number {
        if (!this.currentPlaying) return 0;
        return this.AUDIO_PLAYER.duration - this.AUDIO_PLAYER.currentTime;
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

    public static removeListener(name: string, reason?: any): void {
        const ctrl = this.eventMap.get(name);
        if (!ctrl) return;

        ctrl.abort(reason);
    }
}