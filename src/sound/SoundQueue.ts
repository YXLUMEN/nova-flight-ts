import type {SoundEvent} from "./SoundEvent.ts";
import {clamp, randInt} from "../utils/math/math.ts";
import {shuffleArray} from "../utils/uit.ts";

export class SoundQueue {
    private readonly queue: SoundEvent[];
    private index: number = 0;

    public constructor(queue: SoundEvent[]) {
        this.queue = queue;
    }

    public idx() {
        return this.index;
    }

    public length() {
        return this.queue.length;
    }

    public current() {
        return this.queue[this.index];
    }

    public next(): SoundEvent {
        this.index = (this.index + 1) % this.queue.length;
        return this.queue[this.index];
    }

    public random(): SoundEvent {
        this.index = randInt(0, this.queue.length - 1);
        return this.queue[this.index];
    }

    public switch(index: number): SoundEvent {
        index = clamp(index, 0, this.queue.length - 1);
        this.index = index;
        return this.queue[index];
    }

    public insert(sound: SoundEvent, index: number = -1): number {
        if (index < 0) {
            return this.queue.push(sound);
        }

        index = clamp(index, 0, this.queue.length);
        this.queue.splice(index, 0, sound);
        return index;
    }

    public randomInsert(sound: SoundEvent): number {
        const index = randInt(0, this.queue.length);
        this.insert(sound, index);
        return index;
    }

    public shuffle() {
        shuffleArray(this.queue);
    }

    public indexOf(sound: SoundEvent): number {
        return this.queue.indexOf(sound);
    }

    public remove(sound: SoundEvent): boolean {
        const index = this.queue.indexOf(sound);
        if (index === -1) return false;

        this.queue.splice(index, 1);
        this.index = Math.min(this.index, this.queue.length - 1);
        return true;
    }

    public removeById(index: number, deleteCount?: number): SoundEvent[] {
        const removed = this.queue.splice(index, deleteCount);
        this.index = Math.min(this.index, this.queue.length - 1);
        return removed;
    }
}