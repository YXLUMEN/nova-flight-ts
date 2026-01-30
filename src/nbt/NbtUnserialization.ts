import {BinaryReader} from "./BinaryReader.ts";
import {NbtTypes} from "./NbtValue.ts";
import {NbtCompound} from "./NbtCompound.ts";

type KeyType = Readonly<{ key: string, type: number }>;


export class NbtUnserialization {
    public static fromRootBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound | null {
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

    public static fromBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound {
        const reader = new BinaryReader(buffer);
        return this.fromReader(reader);
    }

    public static fromReader(reader: BinaryReader): NbtCompound {
        const compound = new NbtCompound();

        while (true) {
            const type = reader.readUint8();
            if (type === NbtTypes.End || reader.bytesRemaining() === 0) break;

            const key = reader.readString();
            switch (type) {
                case NbtTypes.Int8:
                    compound.putInt8(key, reader.readInt8());
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
                    compound.putBoolean(key, reader.readInt8() !== 0);
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
                    const nestedBuf = reader.readSlice(nestedLen);
                    const nested = this.fromBinary(nestedBuf);
                    compound.putCompound(key, nested!);
                    break;
                }
                case NbtTypes.NbtList: {
                    const count = reader.readVarUint();
                    const list: NbtCompound[] = [];
                    for (let i = 0; i < count; i++) {
                        const nestedLen = reader.readVarUint();
                        const nestedBuf = reader.readSlice(nestedLen);
                        const nested = this.fromBinary(nestedBuf);
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

    public static fromRootCompactBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound | null {
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

        return this.fromCompactBinary(reader.readSlice(reader.bytesRemaining()));
    }

    public static fromCompactBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound {
        const reader = new BinaryReader(buffer);

        const schemeSize = reader.readVarUint();
        if (schemeSize === 0) return new NbtCompound();

        const scheme: KeyType[] = [];
        for (let i = 0; i < schemeSize; i++) {
            scheme.push({
                key: reader.readString(),
                type: reader.readInt8()
            });
        }

        const payloadEnd = buffer.length - 1;
        const endTag = buffer[payloadEnd];
        if (endTag !== NbtTypes.End) {
            throw new Error(`Expected End tag, got ${endTag}`);
        }

        const payload = buffer.subarray(reader.getOffset(), payloadEnd);
        return schemeSize === 0 ? new NbtCompound() : this.parsePayload(payload, scheme);
    }

    private static parsePayload(buffer: Uint8Array<ArrayBuffer>, scheme: KeyType[]) {
        const reader = new BinaryReader(buffer);
        const compound = new NbtCompound();
        while (reader.bytesRemaining() > 0) {
            this.readField(reader, scheme, compound);
        }

        return compound;
    }

    private static readField(reader: BinaryReader, scheme: KeyType[], compound: NbtCompound): void {
        const index = reader.readVarUint();
        if (index >= scheme.length) {
            throw new Error(`Invalid scheme index: ${index}`);
        }

        const {key, type} = scheme[index];
        switch (type) {
            case NbtTypes.Int8:
                compound.putInt8(key, reader.readInt8());
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
                compound.putBoolean(key, reader.readInt8() !== 0);
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
                const nestedBuf = reader.readSlice(nestedLen);
                const nested = this.parsePayload(nestedBuf, scheme);
                compound.putCompound(key, nested);
                break;
            }
            case NbtTypes.NbtList: {
                const count = reader.readVarUint();
                const list: NbtCompound[] = [];
                for (let i = 0; i < count; i++) {
                    const nestedLen = reader.readVarUint();
                    const nestedBuf = reader.readSlice(nestedLen);
                    const nested = this.parsePayload(nestedBuf, scheme);
                    list.push(nested);
                }
                compound.putCompoundList(key, list);
                break;
            }
            default:
                throw new Error(`Unknown NbtType: ${type}`);
        }
    }
}