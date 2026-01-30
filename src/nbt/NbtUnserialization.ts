import {BinaryReader} from "./BinaryReader.ts";
import {type Nbt, NbtTypes} from "./NbtValue.ts";
import {NbtCompound} from "./NbtCompound.ts";
import {StringReader} from "../brigadier/StringReader.ts";

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
            console.warn('Invalid magic number');
            return null;
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

    public static fromSNbt(snbt: string): NbtCompound {
        const reader = new StringReader(snbt);
        reader.skipAnyWhitespace();
        reader.expect('{');
        return this.parseCompound(reader);
    }

    private static parseCompound(reader: StringReader): NbtCompound {
        const compound = new NbtCompound();

        while (true) {
            reader.skipAnyWhitespace();
            if (reader.peek() === '}') {
                reader.skip();
                break;
            }

            let key: string;
            if (StringReader.isQuotedStringStart(reader.peek())) {
                key = reader.readQuotedString();
            } else {
                key = reader.readUnquotedString();
            }

            reader.skipAnyWhitespace();
            reader.expect(':');

            const nbt = this.parseValue(reader);
            compound.put(key, nbt);

            reader.skipAnyWhitespace();
            if (reader.peek() === ',') {
                reader.skip();
                continue;
            }
            if (reader.peek() === '}') {
                continue;
            }
            throw new Error(`Expected ',' or '}' after value at ${reader.getCursor()}`);
        }

        return compound;
    }

    private static parseValue(reader: StringReader): Nbt {
        reader.skipAnyWhitespace();

        // Compound
        if (reader.peek() === '{') {
            reader.skip();
            return {type: NbtTypes.Compound, value: this.parseCompound(reader)};
        }

        // Array
        if (reader.peek() === '[') {
            reader.skip();
            return this.parseArray(reader);
        }

        // Boolean
        if (reader.canRead(4) && reader.getString().substring(reader.getCursor(), reader.getCursor() + 4) === 'true') {
            reader.setCursor(reader.getCursor() + 4);
            return {type: NbtTypes.Boolean, value: true};
        }
        if (reader.canRead(5) && reader.getString().substring(reader.getCursor(), reader.getCursor() + 5) === 'false') {
            reader.setCursor(reader.getCursor() + 5);
            return {type: NbtTypes.Boolean, value: false};
        }

        if (StringReader.isQuotedStringStart(reader.peek())) {
            const str = reader.readQuotedString();
            return {type: NbtTypes.String, value: str};
        }

        const start = reader.getCursor();
        while (reader.canRead() && StringReader.isAllowedNumber(reader.peek())) {
            reader.skip();
        }

        if (reader.getCursor() === start) {
            throw new Error(`Unexpected token at ${start}: ${reader.getString().substring(start, Math.min(start + 10, reader.getTotalLength()))}`);
        }

        const numStr = reader.getString().substring(start, reader.getCursor());
        let suffix = '';
        if (reader.canRead()) {
            const c = reader.peek().toLowerCase();
            if (['b', 's', 'u', 'f', 'd'].includes(c)) {
                suffix = c;
                reader.skip();
            }
        }

        const num = parseFloat(numStr);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${numStr}`);
        }

        switch (suffix) {
            case 'b':
                return {type: NbtTypes.Int8, value: Math.round(num)};
            case 's':
                return {type: NbtTypes.Int16, value: Math.round(num)};
            case 'u':
                return {type: NbtTypes.Uint, value: Math.round(num)};
            case 'f':
                return {type: NbtTypes.Float, value: num};
            case 'd':
                return {type: NbtTypes.Double, value: num};
            default:
                return {type: NbtTypes.Int32, value: Math.round(num)};
        }
    }

    private static parseArray(reader: StringReader): Nbt {
        reader.skipAnyWhitespace();
        if (reader.peek() === ']') {
            reader.skip();
            return {type: NbtTypes.NumberArray, value: []};
        }

        const items: Nbt[] = [];

        while (true) {
            const item = this.parseValue(reader);
            items.push(item);

            reader.skipAnyWhitespace();
            if (reader.peek() === ',') {
                reader.skip();
            } else if (reader.peek() === ']') {
                reader.skip();
                break;
            } else {
                throw new Error(`Expected ',' or ']' in array at ${reader.getCursor()}`);
            }
        }

        // 推断数组类型
        const types = new Set(items.map(i => i.type));
        if (types.size === 0) {
            return {type: NbtTypes.NumberArray, value: []};
        }
        if (types.size === 1) {
            const t = items[0].type;
            if (t === NbtTypes.Compound) return {
                type: NbtTypes.NbtList,
                value: items.map(i => i.value as NbtCompound)
            };

            if (t === NbtTypes.String) return {
                type: NbtTypes.StringArray,
                value: items.map(i => i.value as string)
            };

            const numType: number[] = [NbtTypes.Int8, NbtTypes.Int16, NbtTypes.Int32, NbtTypes.Uint, NbtTypes.Float, NbtTypes.Double];
            if (numType.includes(t)) return {
                type: NbtTypes.NumberArray,
                value: items.map(i => i.value as number)
            };
        }

        console.warn('Mixed array types, falling back to NumberArray');
        return {
            type: NbtTypes.NumberArray,
            value: items.map(i => typeof i.value === 'number' ? i.value : 0)
        };
    }
}