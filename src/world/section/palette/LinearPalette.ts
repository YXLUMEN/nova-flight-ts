import type {Palette} from "./Palette.ts";
import {clamp} from "../../../utils/math/math.ts";
import type {PaletteResize} from "./PaletteResize.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {IndexedIterable} from "../../../utils/collection/IndexedIterable.ts";
import type {BinaryWriter} from "../../../serialization/BinaryWriter.ts";


export class LinearPalette<T> implements Palette<T> {
    private static readonly MAX_VALUES = 256;

    private readonly values: T[];
    private readonly maxSize: number;
    private size: number;

    public constructor(maxSize: number, entries: T[] = []) {
        maxSize = clamp(Math.floor(maxSize), 1, LinearPalette.MAX_VALUES);

        this.values = new Array(maxSize);
        this.maxSize = maxSize;
        this.size = entries.length;

        if (entries.length > this.maxSize) {
            throw new RangeError(`Can't initialize LinearPalette of size ${this.maxSize} with ${entries.length} entries`);
        }

        for (let i = 0; i < entries.length; i++) {
            this.values[i] = entries[i];
        }
    }

    public idFor(value: T, resizeHandler: PaletteResize<T>): number {
        for (let i = 0; i < this.size; i++) {
            if (this.values[i] === value) {
                return i;
            }
        }

        if (this.size >= this.maxSize) {
            return resizeHandler.onResize(this.maxSize + 1, value);
        }

        this.values[this.size] = value;
        return this.size++;
    }

    public valueFor(index: number): T {
        if (index >= 0 && index < this.size) {
            return this.values[index];
        }
        throw new ReferenceError(`Palette index out of bounds: ${index}`);
    }

    public has(value: T): boolean {
        for (let i = 0; i < this.size; i++) {
            if (this.values[i] === value) {
                return true;
            }
        }
        return false;
    }

    public read(reader: BinaryReader, map: IndexedIterable<T>): void {
        this.size = reader.readVarUint();

        for (let i = 0; i < this.size; i++) {
            this.values[i] = map.getByIndexOrThrow(reader.readVarUint());
        }
    }

    public write(writer: BinaryWriter, map: IndexedIterable<T>): void {
        writer.writeVarUint(this.size);

        for (let i = 0; i < this.size; i++) {
            writer.writeVarUint(map.getIndex(this.values[i]));
        }
    }

    public get length(): number {
        return this.size;
    }

    public getMaxSize(): number {
        return this.maxSize;
    }

    public upgrade(newMaxSize: number): LinearPalette<T> {
        const entries = this.values.slice(0, this.size);
        return new LinearPalette(newMaxSize, entries);
    }
}