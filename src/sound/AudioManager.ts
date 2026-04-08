import {clamp} from "../utils/math/math.ts";
import type {SoundEvent} from "./SoundEvent.ts";
import {isServer} from "../configs/GlobalConfig.ts";
import {MediaWithoutSrc} from "../type/errors.ts";
import type {Consumer} from "../type/types.ts";
import type {AudioResource} from "../client/resource/AudioResource.ts";
import {ResourceManager} from "../client/resource/ResourceManager.ts";
import {Resources} from "../client/resource/Resources.ts";

export class AudioManager {
    private static readonly audio: HTMLAudioElement;
    private static readonly eventMap = new Map<string, AbortController>();

    private static cache: AudioResource | null = null;
    private static disable = false;
    private static currentPlaying: SoundEvent | null = null;

    static {
        if (!isServer) {
            (this.audio as any) = new Audio();
            this.audio.addEventListener('ended', () => this.currentPlaying = null);
        }
    }

    private static get module(): AudioResource {
        if (!this.cache) this.cache = ResourceManager.get<AudioResource>(Resources.AUDIO);
        return this.cache;
    }

    public static playAudio(event: SoundEvent, loop = false) {
        if (this.disable) return;

        const id = event.getId();
        const url = this.module.buffers.get(id);
        if (!url) {
            console.warn(`Can't find sound with id: ${id}`);
            return;
        }

        this.audio.src = url;
        this.audio.loop = loop;
        this.currentPlaying = event;
        return this.audio.play().catch(console.error);
    }

    public static randomPlay(...event: SoundEvent[]) {
        this.playAudio(event[Math.floor(Math.random() * event.length)]);
    }

    public static getCurrentPlaying(): SoundEvent | null {
        return this.currentPlaying;
    }

    public static leap(time: number) {
        if (!this.audio.src) throw new MediaWithoutSrc("Audio does not set");
        const duration = this.audio.duration;
        this.audio.currentTime = clamp(time, 0, Number.isFinite(duration) ? duration : 0);
    }

    public static getDuration(): number {
        return this.audio.duration;
    }

    public static pause(): void {
        this.audio.pause();
    }

    public static resume(): void {
        if (this.currentPlaying) {
            this.audio.play().catch(console.error);
        }
    }

    public static stop(event?: SoundEvent): void {
        if (event && this.currentPlaying !== event) return;

        this.audio.pause();
        this.audio.src = '';
        this.currentPlaying = null;
    }

    public static isDisable(): boolean {
        return this.disable;
    }

    public static setDisable(isDisable: boolean): void {
        this.disable = isDisable;
        if (isDisable) this.stop();
    }

    public static fadeOutAndPause(durationMs: number = 1000): Promise<void> {
        const {promise, resolve} = Promise.withResolvers<void>();
        if (this.audio.paused) {
            resolve();
            return promise;
        }

        const startVolume = this.audio.volume;
        const steps = Math.max(30, Math.floor(durationMs / 16));
        const stepInterval = durationMs / steps;
        let step = 0;

        const fade = () => {
            step++;
            if (step < steps) {
                this.audio.volume = startVolume * startVolume * (1 - step / steps);
                setTimeout(fade, stepInterval);
                return;
            }

            this.audio.volume = 0;
            this.audio.pause();
            this.audio.volume = startVolume;
            resolve();
        }
        fade();

        return promise;
    }

    public static reset(): void {
        this.audio.pause();
        this.audio.currentTime = 0;
    }

    public static setVolume(volume: number): void {
        this.audio.volume = clamp(volume, 0, 1);
    }

    public static getRemainingTime(): number {
        if (!this.currentPlaying) return 0;
        return this.audio.duration - this.audio.currentTime;
    }

    public static addListener(
        name: string,
        type: keyof HTMLMediaElementEventMap,
        listener: Consumer<Event>,
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

        this.audio.addEventListener(type, listener, opts);
        this.eventMap.set(name, ctrl);

        return ctrl;
    }

    public static removeListener(name: string, reason?: any): void {
        const ctrl = this.eventMap.get(name);
        if (!ctrl) return;

        ctrl.abort(reason);
    }

    public static hasListener(name: string) {
        return this.eventMap.has(name);
    }
}