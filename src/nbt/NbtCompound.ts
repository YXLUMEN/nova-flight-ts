import {type Nbt, NbtTypes} from "./NbtValue";
import {BinaryWriter} from "./BinaryWriter.ts";
import {BinaryReader} from "./BinaryReader.ts";

export class NbtCompound {
    public static readonly MAGIC = 0x6E627430;
    public static readonly VERSION = 3;

    private entries: Map<string, Nbt> = new Map();

    public putByte(key: string, value: number): this {
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
        console.assert(Number.isInteger(value) && value >= 0, `[NBT] ${key} expected integer, got ${value}`);
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

    public getByte(key: string, d = 0): number {
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

    public has(key: string): boolean {
        return this.entries.has(key);
    }

    public isEmpty(): boolean {
        return this.entries.size === 0;
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

    public static fromRootBinary(buffer: Uint8Array): NbtCompound | null {
        const reader = new BinaryReader(buffer);

        const magic = reader.readInt32();
        if (magic !== NbtCompound.MAGIC) {
            throw new Error('Invalid magic number');
        }

        const version = reader.readInt16();
        if (version !== NbtCompound.VERSION) {
            console.warn(`Unsupported version: ${version}`);
            return null;
        }

        return this.fromReader(reader);
    }

    public static fromBinary(buffer: Uint8Array): NbtCompound {
        const reader = new BinaryReader(buffer);
        return this.fromReader(reader);
    }

    public static fromReader(reader: BinaryReader): NbtCompound {
        const compound = new NbtCompound();

        while (true) {
            const type = reader.readUnsignByte();
            if (type === NbtTypes.End) break;

            const key = reader.readString();
            switch (type) {
                case NbtTypes.Int8:
                    compound.putByte(key, reader.readByte());
                    break;
                case NbtTypes.Int16:
                    compound.putInt16(key, reader.readInt16());
                    break;
                case NbtTypes.Int32:
                    compound.putInt32(key, reader.readInt32());
                    break;
                case NbtTypes.Float:
                    compound.putFloat(key, reader.readFloat());
                    break;
                case NbtTypes.Double:
                    compound.putDouble(key, reader.readDouble());
                    break;
                case NbtTypes.Uint:
                    compound.putUint(key, reader.readUint32());
                    break;
                case NbtTypes.String:
                    compound.putString(key, reader.readString());
                    break;
                case NbtTypes.Boolean:
                    compound.putBoolean(key, reader.readByte() !== 0);
                    break;
                case NbtTypes.NumberArray: {
                    const len = reader.readVarUint();
                    const arr: number[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readDouble();
                    compound.putNumberArray(key, ...arr);
                    break;
                }
                case NbtTypes.StringArray: {
                    const len = reader.readVarUint();
                    const arr: string[] = new Array(len);
                    for (let i = 0; i < len; i++) arr[i] = reader.readString();
                    compound.putStringArray(key, ...arr);
                    break;
                }
                case NbtTypes.Compound: {
                    const nestedLen = reader.readVarUint();
                    console.assert(reader.bytesRemaining() >= nestedLen, `[NBT] nested length overflow for key "${key}"`);
                    const nestedBuf = reader.readSlice(nestedLen);
                    const nested = NbtCompound.fromBinary(nestedBuf);
                    compound.putCompound(key, nested!);
                    break;
                }
                case NbtTypes.NbtList: {
                    const count = reader.readVarUint();
                    const list: NbtCompound[] = [];
                    for (let i = 0; i < count; i++) {
                        const nestedLen = reader.readVarUint();
                        console.assert(reader.bytesRemaining() >= nestedLen, `[NBT] nested length overflow in list for key "${key}"`);
                        const nestedBuf = reader.readSlice(nestedLen);
                        const nested = NbtCompound.fromBinary(nestedBuf);
                        list.push(nested!);
                    }
                    compound.putCompoundList(key, list);
                    break;
                }
                default:
                    throw new Error(`Unknown NbtType: ${type}`);
            }
        }

        return compound;
    }

    public toRootBinary(): Uint8Array {
        const writer = new BinaryWriter();

        writer.writeInt32(NbtCompound.MAGIC);
        writer.writeInt16(NbtCompound.VERSION);

        return this.toBinary(writer);
    }

    public toBinary(writer?: BinaryWriter): Uint8Array {
        if (!writer) {
            writer = new BinaryWriter();
        }

        for (const [key, {type, value}] of this.entries) {
            writer.writeByte(type);
            writer.writeString(key);

            switch (type) {
                case NbtTypes.Int8:
                    writer.writeByte(value as number);
                    break;
                case NbtTypes.Int16:
                    writer.writeInt16(value as number);
                    break;
                case NbtTypes.Int32:
                    writer.writeInt32(value as number);
                    break;
                case NbtTypes.Float:
                    writer.writeFloat(value as number);
                    break;
                case NbtTypes.Double:
                    writer.writeDouble(value as number);
                    break;
                case NbtTypes.Uint:
                    writer.writeUint32(value as number);
                    break;
                case NbtTypes.String:
                    writer.writeString(value as string);
                    break;
                case NbtTypes.Boolean:
                    writer.writeByte(value ? 1 : 0);
                    break;
                case NbtTypes.NumberArray: {
                    const values = value as number[];
                    writer.writeVarUint(values.length);
                    for (const n of values) writer.writeDouble(n);
                    break;
                }
                case NbtTypes.StringArray: {
                    const values = value as string[];
                    writer.writeVarUint(values.length);
                    for (const s of values) writer.writeString(s);
                    break;
                }
                case NbtTypes.Compound: {
                    const values = value as NbtCompound;
                    const nested = values.toBinary();
                    writer.writeVarUint(nested.length);
                    writer.pushBytes(nested);
                    break;
                }
                case NbtTypes.NbtList: {
                    const list = value as NbtCompound[];
                    writer.writeVarUint(list.length);
                    for (const compound of list) {
                        const nested = compound.toBinary();
                        writer.writeVarUint(nested.length);
                        writer.pushBytes(nested);
                    }
                    break;
                }
            }
        }

        writer.writeByte(NbtTypes.End);
        return writer.toUint8Array();
    }
}
