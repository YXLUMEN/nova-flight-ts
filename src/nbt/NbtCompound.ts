import {type Nbt, NbtTypes} from "./NbtValue.ts";

export class NbtCompound {
    public static readonly MAGIC = 0x6E627430;
    public static readonly VERSION = 3;

    private readonly entries: Map<string, Nbt> = new Map();

    public putInt8(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -128 && value <= 127, "Int8 out of range");
        this.entries.set(key, {type: NbtTypes.Int8, value});
        return this;
    }

    public putInt16(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -32768 && value <= 32767, "Int16 out of range");
        this.entries.set(key, {type: NbtTypes.Int16, value});
        return this;
    }

    public putInt32(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -2147483648 && value <= 2147483647, "Int32 out of range");
        this.entries.set(key, {type: NbtTypes.Int32, value});
        return this;
    }

    public putFloat(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Float must be finite");
        this.entries.set(key, {type: NbtTypes.Float, value});
        return this;
    }

    public putDouble(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Double must be finite");
        this.entries.set(key, {type: NbtTypes.Double, value});
        return this;
    }

    public putUint(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF,
            `[NBT] ${key} expected uint32 (0 ~ ${0xFFFFFFFF}), got ${value}`);
        this.entries.set(key, {type: NbtTypes.Uint, value: value | 0});
        return this;
    }

    public putString(key: string, value: string): this {
        this.entries.set(key, {type: NbtTypes.String, value});
        return this;
    }

    public putBoolean(key: string, value: boolean): this {
        this.entries.set(key, {type: NbtTypes.Boolean, value});
        return this;
    }

    public putNumberArray(key: string, ...value: number[]): this {
        this.entries.set(key, {type: NbtTypes.NumberArray, value});
        return this;
    }

    public putStringArray(key: string, ...value: string[]): this {
        this.entries.set(key, {type: NbtTypes.StringArray, value});
        return this;
    }

    public putCompound(key: string, value: NbtCompound): this {
        this.entries.set(key, {type: NbtTypes.Compound, value});
        return this;
    }

    public putCompoundList(key: string, value: NbtCompound[]) {
        this.entries.set(key, {type: NbtTypes.NbtList, value});
        return this;
    }

    public getInt8(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Int8 ? (v.value as number) : d;
    }

    public getInt16(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Int16 ? (v.value as number) : d;
    }

    public getInt32(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Int32 ? (v.value as number) : d;
    }

    public getFloat(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Float ? (v.value as number) : d;
    }

    public getDouble(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Double ? (v.value as number) : d;
    }

    public getUint(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Uint ? (v.value as number) : d;
    }

    public getString(key: string, d = ""): string {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.String ? (v.value as string) : d;
    }

    public getBoolean(key: string, d = false): boolean {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Boolean ? (v.value as boolean) : d;
    }

    public getNumberArray(key: string, d: number[] = []): number[] {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.NumberArray ? (v.value as number[]) : d;
    }

    public getStringArray(key: string, d: string[] = []): string[] {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.StringArray ? (v.value as string[]) : d;
    }

    public getCompound(key: string): NbtCompound | null {
        const v = this.entries.get(key);
        return v && v.type === NbtTypes.Compound ? (v.value as NbtCompound) : null;
    }

    public getCompoundList(key: string): NbtCompound[] | null {
        const nbtList = this.entries.get(key);
        return nbtList && nbtList.type === NbtTypes.NbtList ? (nbtList.value as NbtCompound[]) : null;
    }

    public remove(key: string): this {
        this.entries.delete(key);
        return this;
    }

    public clear(): this {
        this.entries.clear();
        return this;
    }

    public has(key: string): boolean {
        return this.entries.has(key);
    }

    public isEmpty(): boolean {
        return this.entries.size === 0;
    }

    public getEntries(): ReadonlyMap<string, Nbt> {
        return this.entries;
    }

    public getKeys(): Set<string> {
        return new Set<string>(this.entries.keys());
    }

    public getEntrySet(): Set<[string, Nbt]> {
        return new Set(this.entries.entries());
    }

    public getSize(): number {
        return this.entries.size;
    }

    public put(key: string, nbt: Nbt) {
        this.entries.set(key, nbt);
    }
}
