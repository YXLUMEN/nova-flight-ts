import type {IndexedIterable} from "./IndexedIterable.ts";

export class IdMap<T> implements IndexedIterable<T> {
    private readonly tToId: Map<T, number> = new Map();
    private readonly idToT: Array<T | null> = [];
    private nextId: number = 0;

    public addMapping(thing: T, id: number): void {
        this.tToId.set(thing, id);

        while (this.idToT.length <= id) {
            this.idToT.push(null);
        }

        this.idToT[id] = thing;
        if (this.nextId <= id) {
            this.nextId = id + 1;
        }
    }

    public add(thing: T): void {
        this.addMapping(thing, this.nextId);
    }

    public getIndex(value: T): number {
        return this.tToId.get(value) ?? -1;
    }

    public getByIndex(index: number): T | null {
        if (index < 0 || index >= this.idToT.length) return null;
        return this.idToT[index];
    }

    public getByIndexOrThrow(index: number): T {
        const value = this.getByIndex(index);
        if (value === null) throw new ReferenceError(`No value with id ${index}`);
        return value;
    }

    public getIndexOrThrow(value: T): number {
        const index = this.getIndex(value);
        if (index === -1) throw new ReferenceError(`Can't find id for ${value}`);
        return index;
    }

    public size(): number {
        return this.tToId.size;
    }

    public [Symbol.iterator](): Iterator<T, any, any> {
        return this.tToId.keys();
    }
}