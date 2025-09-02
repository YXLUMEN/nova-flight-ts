import type {SoundEvent} from "./SoundEvent.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import type {Identifier} from "../registry/Identifier.ts";

export class SoundSystem {
    private static audioContext = new AudioContext();
    private static readonly loadedSounds = new HashMap<Identifier, AudioBuffer>();

    public static async loadStatic(id: Identifier, path: string, url: string): Promise<void> {
        const res = await fetch(`nova-flight/${url}/sounds/${path}.wav`);
        const buffer = await res.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(buffer);
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