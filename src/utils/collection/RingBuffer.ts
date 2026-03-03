import {clamp} from "../math/math.ts";

export class RingBuffer<T> {
    private buffer: (T | null)[];
    private head: number = 0;
    private tail: number = 0;
    private size: number = 0;
    private capacity: number;
    private readonly allowExpand: boolean;

    public constructor(initialCapacity: number = 32, allowExpand = false) {
        const capacity = clamp(initialCapacity, 1, 32767);
        this.capacity = capacity;
        this.buffer = new Array(capacity).fill(null);
        this.allowExpand = allowExpand;
    }

    public push(item: T): void {
        if (this.size === this.capacity) {
            if (this.allowExpand) this.resize();
            else this.shift();
        }
        this.buffer[this.tail] = item;
        this.tail = (this.tail + 1) % this.capacity;
        this.size++;
    }

    public shift(): T | null {
        if (this.size === 0) return null;

        const item = this.buffer[this.head];
        this.buffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.size--;
        return item;
    }

    public isEmpty(): boolean {
        return this.size === 0;
    }

    public getSize(): number {
        return this.size;
    }

    private resize(): void {
        const newCapacity = this.capacity * 2;
        const newBuffer: (T | null)[] = new Array(newCapacity).fill(null);

        for (let i = 0; i < this.size; i++) {
            newBuffer[i] = this.buffer[(this.head + i) % this.capacity];
        }

        this.buffer = newBuffer;
        this.head = 0;
        this.tail = this.size;
        this.capacity = newCapacity;
    }

    public reset(): void {
        this.size = 0;
        this.head = 0;
        this.tail = 0;
    }

    public clear(): void {
        this.reset();
        this.buffer.length = 0;
    }
}