import {NbtCompound} from "./NbtCompound.ts";
import {type Nbt, NbtTypes} from "./NbtValue.ts";
import {BinaryWriter} from "./BinaryWriter.ts";

export class SchemeNbt {
    private readonly entries: Map<number, Nbt> = new Map();
    private readonly keyMap: Map<string, KeyIndex>;

    public constructor(parent?: SchemeNbt) {
        this.keyMap = parent ? parent.keyMap : new Map();
    }

    private setIndex(key: string): number {
        const entry = this.keyMap.get(key);
        if (entry) return entry.index;

        this.keyMap.set(key, {key, index: this.keyMap.size});
        return this.keyMap.size;
    }

    private getIndex(key: string): number | null {
        return this.keyMap.get(key)?.index ?? null;
    }

    public putInt8(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -128 && value <= 127, "Int8 out of range");
        this.entries.set(this.setIndex(key), {type: NbtTypes.Int8, value});
        return this;
    }

    public putInt16(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -32768 && value <= 32767, "Int16 out of range");
        this.entries.set(this.setIndex(key), {type: NbtTypes.Int16, value});
        return this;
    }

    public putInt32(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -2147483648 && value <= 2147483647, "Int32 out of range");
        this.entries.set(this.setIndex(key), {type: NbtTypes.Int32, value});
        return this;
    }

    public putFloat(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Float must be finite");
        this.entries.set(this.setIndex(key), {type: NbtTypes.Float, value});
        return this;
    }

    public putDouble(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Double must be finite");
        this.entries.set(this.setIndex(key), {type: NbtTypes.Double, value});
        return this;
    }

    public putUint(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF,
            `[NBT] ${key} expected uint32 (0 ~ ${0xFFFFFFFF}), got ${value}`);
        this.entries.set(this.setIndex(key), {type: NbtTypes.Uint, value: value | 0});
        return this;
    }

    public putString(key: string, value: string): this {
        this.entries.set(this.setIndex(key), {type: NbtTypes.String, value});
        return this;
    }

    public putBoolean(key: string, value: boolean): this {
        this.entries.set(this.setIndex(key), {type: NbtTypes.Boolean, value});
        return this;
    }

    public putNumberArray(key: string, ...value: number[]): this {
        this.entries.set(this.setIndex(key), {type: NbtTypes.NumberArray, value});
        return this;
    }

    public putStringArray(key: string, ...value: string[]): this {
        this.entries.set(this.setIndex(key), {type: NbtTypes.StringArray, value});
        return this;
    }

    public putCompound(key: string, value: NbtCompound): this {
        this.entries.set(this.setIndex(key), {type: NbtTypes.Compound, value});
        return this;
    }

    public putCompoundList(key: string, value: NbtCompound[]) {
        this.entries.set(this.setIndex(key), {type: NbtTypes.NbtList, value});
        return this;
    }

    public getInt8(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Int8 ? (v.value as number) : d;
    }

    public getInt16(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Int16 ? (v.value as number) : d;
    }

    public getInt32(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Int32 ? (v.value as number) : d;
    }

    public getFloat(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Float ? (v.value as number) : d;
    }

    public getDouble(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Double ? (v.value as number) : d;
    }

    public getUint(key: string, d = 0): number {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Uint ? (v.value as number) : d;
    }

    public getString(key: string, d = ""): string {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.String ? (v.value as string) : d;
    }

    public getBoolean(key: string, d = false): boolean {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Boolean ? (v.value as boolean) : d;
    }

    public getNumberArray(key: string, d: number[] = []): number[] {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.NumberArray ? (v.value as number[]) : d;
    }

    public getStringArray(key: string, d: string[] = []): string[] {
        const index = this.getIndex(key);
        if (!index) return d;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.StringArray ? (v.value as string[]) : d;
    }

    public getCompound(key: string): NbtCompound | null {
        const index = this.getIndex(key);
        if (!index) return null;

        const v = this.entries.get(index);
        return v && v.type === NbtTypes.Compound ? (v.value as NbtCompound) : null;
    }

    public getCompoundList(key: string): NbtCompound[] | null {
        const index = this.getIndex(key);
        if (!index) return null;

        const nbtList = this.entries.get(index);
        return nbtList && nbtList.type === NbtTypes.NbtList ? (nbtList.value as NbtCompound[]) : null;
    }

    public remove(key: string): this {
        const index = this.getIndex(key);
        if (index === null) return this;

        this.keyMap.delete(key);
        this.entries.delete(index);
        return this;
    }

    public clear(): this {
        this.entries.clear();
        return this;
    }

    public has(key: string): boolean {
        return this.keyMap.has(key);
    }

    public isEmpty(): boolean {
        return this.entries.size === 0;
    }

    public getKeys(): Set<string> {
        return new Set<string>(this.keyMap.keys());
    }

    public toBinary(): Uint8Array {
        const writer = new BinaryWriter();

        writer.writeVarUint(this.keyMap.size);
        for (const key of this.keyMap.keys()) {
            writer.writeString(key);
        }



        writer.writeInt8(NbtTypes.End);
        return writer.toUint8Array();
    }
}

type KeyIndex = Readonly<{ key: string, index: number }>;