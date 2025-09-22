import type {NbtValue} from "./NbtValue";
import {NbtBinaryWriter} from "./NbtBinaryWriter";
import {NbtBinaryReader} from "./NbtBinaryReader";

export class NbtCompound {
    private entries: Map<string, NbtValue> = new Map();

    public putInt(key: string, value: number): this {
        console.assert(Number.isInteger(value),
            `[NBT] ${key} expected integer, got ${value}`
        );
        this.entries.set(key, value | 0);
        return this;
    }

    public getInt(key: string, d = 0): number {
        const v = this.entries.get(key);
        return typeof v === "number" ? (v | 0) : d;
    }

    public putDouble(key: string, value: number): this {
        this.entries.set(key, value); // 保留原始浮点数
        return this;
    }

    public getDouble(key: string, d = 0): number {
        const v = this.entries.get(key);
        return typeof v === "number" ? v : d;
    }

    public putString(key: string, value: string): this {
        console.assert(typeof value === "string", `[NBT] ${key} expected string`);
        this.entries.set(key, value);
        return this;
    }

    public getString(key: string, d = ""): string {
        const v = this.entries.get(key);
        return typeof v === "string" ? v : d;
    }

    public putBoolean(key: string, value: boolean): this {
        console.assert(typeof value === "boolean", `[NBT] ${key} expected boolean`);
        this.entries.set(key, value);
        return this;
    }

    public getBoolean(key: string, d = false): boolean {
        const v = this.entries.get(key);
        return typeof v === "boolean" ? v : d;
    }

    public putNumberArray(key: string, ...value: number[]): this {
        console.assert(
            Array.isArray(value) && value.every(n => typeof n === "number"),
            `[NBT] ${key} expected number[]`
        );
        this.entries.set(key, value);
        return this;
    }

    public getNumberArray(key: string, d: number[] = []): number[] {
        const v = this.entries.get(key);
        return Array.isArray(v) && v.every(n => typeof n === "number") ? v : d;
    }

    public putStringArray(key: string, ...value: string[]): this {
        console.assert(
            Array.isArray(value) && value.every(s => typeof s === "string"),
            `[NBT] ${key} expected string[]`
        );
        this.entries.set(key, value);
        return this;
    }

    public getStringArray(key: string, d: string[] = []): string[] {
        const v = this.entries.get(key);
        return Array.isArray(v) && v.every(s => typeof s === "string") ? v : d;
    }

    public putCompound(key: string, value: NbtCompound): this {
        console.assert(value instanceof NbtCompound, `[NBT] ${key} expected compound`);
        this.entries.set(key, value);
        return this;
    }

    public getCompound(key: string): NbtCompound | undefined {
        const v = this.entries.get(key);
        return v instanceof NbtCompound ? v : undefined;
    }

    public remove(key: string): this {
        this.entries.delete(key);
        return this;
    }

    public has(key: string): boolean {
        return this.entries.has(key);
    }

    public toBinary(): Uint8Array {
        const w = new NbtBinaryWriter();

        for (const [k, v] of this.entries) {
            if (typeof v === "number" && Number.isInteger(v)) {
                w.writeByte(1);
                w.writeString(k);
                w.writeInt32(v | 0);
            } else if (typeof v === "number") {
                w.writeByte(7);
                w.writeString(k);
                w.writeDouble(v);
            } else if (typeof v === "string") {
                w.writeByte(2);
                w.writeString(k);
                w.writeString(v);
            } else if (typeof v === "boolean") {
                w.writeByte(3);
                w.writeString(k);
                w.writeByte(v ? 1 : 0);
            } else if (Array.isArray(v) && v.every(x => typeof x === "number")) {
                w.writeByte(4);
                w.writeString(k);
                w.writeInt32(v.length);
                for (const n of v) w.writeInt32(n | 0);
            } else if (Array.isArray(v) && v.every(x => typeof x === "string")) {
                w.writeByte(5);
                w.writeString(k);
                w.writeInt32(v.length);
                for (const s of v) w.writeString(s);
            } else if (v instanceof NbtCompound) {
                const nested = v.toBinary();
                w.writeByte(6);
                w.writeString(k);
                w.writeInt32(nested.length);
                for (let i = 0; i < nested.length; i++) {
                    w.writeByte(nested[i]);
                }
            }
        }

        w.writeByte(0);
        return w.toUint8Array();
    }

    public static fromBinary(buffer: Uint8Array): NbtCompound {
        const reader = new NbtBinaryReader(buffer);
        const compound = new NbtCompound();

        while (true) {
            const type = reader.readByte();
            if (type === 0) break;

            const key = reader.readString();
            switch (type) {
                case 1:
                    compound.putInt(key, reader.readInt32());
                    break;
                case 7:
                    compound.putDouble(key, reader.readDouble());
                    break;
                case 2:
                    compound.putString(key, reader.readString());
                    break;
                case 3:
                    compound.putBoolean(key, reader.readByte() === 1);
                    break;
                case 4: {
                    const len = reader.readInt32();
                    const arr: number[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readInt32();
                    compound.putNumberArray(key, ...arr);
                    break;
                }
                case 5: {
                    const len = reader.readInt32();
                    const arr: string[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readString();
                    compound.putStringArray(key, ...arr);
                    break;
                }
                case 6: {
                    const nestedLen = reader.readInt32();
                    console.assert(reader.bytesRemaining() >= nestedLen, `[NBT] nested length overflow for key "${key}"`);
                    const slice = reader.readSlice(nestedLen);
                    const nested = NbtCompound.fromBinary(slice);
                    compound.putCompound(key, nested);
                    break;
                }
                default:
                    throw new Error(`[NBT] Unknown tag type ${type} for key "${key}"`);
            }
        }

        return compound;
    }
}
