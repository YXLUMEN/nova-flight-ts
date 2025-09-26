import {type Nbt, NbtType} from "./NbtValue";
import {NbtBinaryWriter} from "./NbtBinaryWriter";
import {NbtBinaryReader} from "./NbtBinaryReader";

export class NbtCompound {
    public static readonly MAGIC = 0x6E627430;
    public static readonly VERSION = 1;

    private entries: Map<string, Nbt> = new Map();

    public putInt8(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -128 && value <= 127, "Int8 out of range");
        this.entries.set(key, {type: NbtType.Int8, value});
        return this;
    }

    public putInt16(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -32768 && value <= 32767, "Int16 out of range");
        this.entries.set(key, {type: NbtType.Int16, value});
        return this;
    }

    public putInt32(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= -2147483648 && value <= 2147483647, "Int32 out of range");
        this.entries.set(key, {type: NbtType.Int32, value});
        return this;
    }

    public putFloat(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Float must be finite");
        this.entries.set(key, {type: NbtType.Float, value});
        return this;
    }

    public putDouble(key: string, value: number): this {
        console.assert(Number.isFinite(value), "Double must be finite");
        this.entries.set(key, {type: NbtType.Double, value});
        return this;
    }

    public putUint(key: string, value: number): this {
        console.assert(Number.isInteger(value) && value >= 0, `[NBT] ${key} expected integer, got ${value}`);
        this.entries.set(key, {type: NbtType.Uint, value: value | 0});
        return this;
    }

    public putString(key: string, value: string): this {
        this.entries.set(key, {type: NbtType.String, value});
        return this;
    }

    public putBoolean(key: string, value: boolean): this {
        this.entries.set(key, {type: NbtType.Boolean, value});
        return this;
    }

    public putNumberArray(key: string, ...value: number[]): this {
        this.entries.set(key, {type: NbtType.NumberArray, value});
        return this;
    }

    public putStringArray(key: string, ...value: string[]): this {
        this.entries.set(key, {type: NbtType.StringArray, value});
        return this;
    }

    public putCompound(key: string, value: NbtCompound): this {
        this.entries.set(key, {type: NbtType.Compound, value});
        return this;
    }

    public putNbtList(key: string, value: NbtCompound[]) {
        this.entries.set(key, {type: NbtType.NbtList, value});
        return this;
    }

    public getInt8(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Int8 ? (v.value as number) : d;
    }

    public getInt16(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Int16 ? (v.value as number) : d;
    }

    public getInt32(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Int32 ? (v.value as number) : d;
    }

    public getFloat(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Float ? (v.value as number) : d;
    }

    public getDouble(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Double ? (v.value as number) : d;
    }

    public getUint(key: string, d = 0): number {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Uint ? (v.value as number) : d;
    }

    public getString(key: string, d = ""): string {
        const v = this.entries.get(key);
        return v && v.type === NbtType.String ? (v.value as string) : d;
    }

    public getBoolean(key: string, d = false): boolean {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Boolean ? (v.value as boolean) : d;
    }

    public getNumberArray(key: string, d: number[] = []): number[] {
        const v = this.entries.get(key);
        return v && v.type === NbtType.NumberArray ? (v.value as number[]) : d;
    }

    public getStringArray(key: string, d: string[] = []): string[] {
        const v = this.entries.get(key);
        return v && v.type === NbtType.StringArray ? (v.value as string[]) : d;
    }

    public getCompound(key: string): NbtCompound | null {
        const v = this.entries.get(key);
        return v && v.type === NbtType.Compound ? (v.value as NbtCompound) : null;
    }

    public getNbtList(key: string): NbtCompound[] | null {
        const nbtList = this.entries.get(key);
        return nbtList && nbtList.type === NbtType.NbtList ? (nbtList.value as NbtCompound[]) : null;
    }

    public remove(key: string): this {
        this.entries.delete(key);
        return this;
    }

    public has(key: string): boolean {
        return this.entries.has(key);
    }

    public toBinary(): Uint8Array {
        const writer = new NbtBinaryWriter();

        writer.writeInt32(NbtCompound.MAGIC);
        writer.writeInt16(NbtCompound.VERSION);

        for (const [key, {type, value}] of this.entries) {
            writer.writeInt8(type);
            writer.writeString(key);

            switch (type) {
                case NbtType.Int8:
                    writer.writeInt8(value as number);
                    break;
                case NbtType.Int16:
                    writer.writeInt16(value as number);
                    break;
                case NbtType.Int32:
                    writer.writeInt32(value as number);
                    break;
                case NbtType.Float:
                    writer.writeFloat(value as number);
                    break;
                case NbtType.Double:
                    writer.writeDouble(value as number);
                    break;
                case NbtType.Uint:
                    writer.writeUint32(value as number);
                    break;
                case NbtType.String:
                    writer.writeString(value as string);
                    break;
                case NbtType.Boolean:
                    writer.writeInt8(value ? 1 : 0);
                    break;
                case NbtType.NumberArray: {
                    const values = value as number[];
                    writer.writeInt32(values.length);
                    for (const n of values) writer.writeDouble(n);
                    break;
                }
                case NbtType.StringArray: {
                    const values = value as string[];
                    writer.writeInt32(values.length);
                    for (const s of values) writer.writeString(s);
                    break;
                }
                case NbtType.Compound: {
                    const values = value as NbtCompound;
                    const nested = values.toBinary();
                    writer.writeInt32(nested.length);
                    writer.pushBytes(nested);
                    break;
                }
                case NbtType.NbtList: {
                    const list = value as NbtCompound[];
                    writer.writeInt32(list.length);
                    for (const compound of list) {
                        const nested = compound.toBinary();
                        writer.writeInt32(nested.length);
                        writer.pushBytes(nested);
                    }
                    break;
                }
            }
        }

        writer.writeInt8(NbtType.End);
        return writer.toUint8Array();
    }

    public static fromBinary(buffer: Uint8Array): NbtCompound {
        const reader = new NbtBinaryReader(buffer);

        const magic = reader.readInt32();
        if (magic !== NbtCompound.MAGIC) {
            throw new Error('Invalid magic number');
        }

        const version = reader.readInt16();
        if (version !== NbtCompound.VERSION) {
            throw new Error(`Unsupported version: ${version}`);
        }

        const compound = new NbtCompound();

        while (true) {
            const type = reader.readInt8();
            if (type === NbtType.End) break;

            const key = reader.readString();
            switch (type) {
                case NbtType.Int8:
                    compound.putInt8(key, reader.readInt8());
                    break;
                case NbtType.Int16:
                    compound.putInt16(key, reader.readInt16());
                    break;
                case NbtType.Int32:
                    compound.putInt32(key, reader.readInt32());
                    break;
                case NbtType.Float:
                    compound.putFloat(key, reader.readFloat());
                    break;
                case NbtType.Double:
                    compound.putDouble(key, reader.readDouble());
                    break;
                case NbtType.Uint:
                    compound.putUint(key, reader.readUint32());
                    break;
                case NbtType.String:
                    compound.putString(key, reader.readString());
                    break;
                case NbtType.Boolean:
                    compound.putBoolean(key, reader.readInt8() !== 0);
                    break;
                case NbtType.NumberArray: {
                    const len = reader.readInt32();
                    const arr: number[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readDouble();
                    compound.putNumberArray(key, ...arr);
                    break;
                }
                case NbtType.StringArray: {
                    const len = reader.readInt32();
                    const arr: string[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readString();
                    compound.putStringArray(key, ...arr);
                    break;
                }
                case NbtType.Compound: {
                    const nestedLen = reader.readInt32();
                    console.assert(reader.bytesRemaining() >= nestedLen, `[NBT] nested length overflow for key "${key}"`);
                    const nestedBuf = reader.readSlice(nestedLen);
                    const nested = NbtCompound.fromBinary(nestedBuf);
                    compound.putCompound(key, nested);
                    break;
                }
                case NbtType.NbtList: {
                    const count = reader.readInt32();
                    const list: NbtCompound[] = [];
                    for (let i = 0; i < count; i++) {
                        const nestedLen = reader.readInt32();
                        console.assert(reader.bytesRemaining() >= nestedLen, `[NBT] nested length overflow in list for key "${key}"`);
                        const nestedBuf = reader.readSlice(nestedLen);
                        const nested = NbtCompound.fromBinary(nestedBuf);
                        list.push(nested);
                    }
                    compound.putNbtList(key, list);
                    break;
                }
                default:
                    throw new Error(`Unknown NbtType: ${type}`);
            }
        }

        return compound;
    }
}
