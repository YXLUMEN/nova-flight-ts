import type {SoundEvent} from "./SoundEvent.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import {Identifier} from "../registry/Identifier.ts";
import {clamp} from "../utils/math/math.ts";
import type {SoundModule} from "../resource/SoundModule.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";

export class SoundSystem {
    private readonly module: SoundModule;
    private readonly activeLoops = new HashMap<Identifier, AudioBufferSourceNode>();
    private readonly audioContext: AudioContext;
    private readonly gainNode: GainNode;

    public constructor() {
        this.module = ResourceManager.get(Resources.SOUND);
        this.audioContext = new AudioContext();
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
    }

    public playSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.loadSound(event, volume, pitch, false);
    }

    public playLoopSound(event: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.loadSound(event, volume, pitch, true);
    }

    private loadSound(event: SoundEvent, volume: number = 1, pitch: number = 1, loop: boolean = false): void {
        const key = event.getId();
        if (this.activeLoops.has(key)) return;

        const buffers = this.module.buffers.get(event.getId());
        if (!buffers || buffers.length === 0) return;

        const buffer = buffers[(Math.random() * buffers.length) | 0];
        const source = this.audioContext.createBufferSource();

        source.buffer = buffer;
        source.loop = loop;
        source.playbackRate.value = pitch;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = clamp(volume, 0, 1);

        source.connect(gainNode);
        gainNode.connect(this.gainNode);
        source.start(0);

        if (loop) this.activeLoops.set(key, source);
    }

    public stopLoopSound(event: SoundEvent): boolean {
        const key = event.getId();
        const source = this.activeLoops.get(key);
        if (source) {
            source.stop();
            this.activeLoops.delete(key);
            return true;
        }
        return false;
    }

    public stopAll() {
        for (const sound of this.activeLoops.values()) {
            sound.stop();
        }
        this.activeLoops.clear();
    }

    public pauseAll(): Promise<void> {
        return this.audioContext.suspend();
    }

    public resumeAll(): Promise<void> {
        return this.audioContext.resume();
    }
}