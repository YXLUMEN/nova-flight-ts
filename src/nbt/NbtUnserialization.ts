import {BinaryReader} from "../serialization/BinaryReader.ts";
import {NbtCompound} from "./element/NbtCompound.ts";
import {StringReader} from "../brigadier/StringReader.ts";
import {NbtTypeId} from "./NbtType.ts";
import type {NbtElement} from "./element/NbtElement.ts";
import {NbtInt8} from "./element/NbtInt8.ts";
import {NbtString} from "./element/NbtString.ts";
import {NbtInt16} from "./element/NbtInt16.ts";
import {NbtUint32} from "./element/NbtUint32.ts";
import {NbtFloat} from "./element/NbtFloat.ts";
import {NbtDouble} from "./element/NbtDouble.ts";
import {NbtInt32} from "./element/NbtInt32.ts";
import {NbtInt32Array} from "./element/NbtInt32Array.ts";
import {NbtCompoundArray} from "./element/NbtCompoundArray.ts";
import {NbtStringArray} from "./element/NbtStringArray.ts";
import {NbtDoubleArray} from "./element/NbtDoubleArray.ts";
import {NbtInt8Array} from "./element/NbtInt8Array.ts";
import {NbtInt16Array} from "./element/NbtInt16Array.ts";
import {NbtFloatArray} from "./element/NbtFloatArray.ts";
import {NbtUint32Array} from "./element/NbtUint32Array.ts";
import {NbtTypes} from "./NbtTypes.ts";

type KeyType = Readonly<{ key: string, type: number }>;


export class NbtUnserialization {
    public static readonly VALIDA_NUMBER_PREFIX = ['B', 'S', 'U', 'F', 'D', 'I'];

    private static checkMagic(buffer: Uint8Array<ArrayBuffer>) {
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
        return reader;
    }

    public static fromRootBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound | null {
        const reader = this.checkMagic(buffer);
        if (!reader) return null;
        return NbtCompound.TYPE.read(reader);
    }

    public static fromBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound {
        const reader = new BinaryReader(buffer);
        return NbtCompound.TYPE.read(reader);
    }

    public static fromRootCompactBinary(buffer: Uint8Array<ArrayBuffer>): NbtCompound | null {
        const reader = this.checkMagic(buffer);
        if (!reader) return null;
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
        if (endTag !== NbtTypeId.End) {
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
        if (type === NbtTypeId.Compound) {
            const nestedLen = reader.readVarUint();
            const nestedBuf = reader.readSlice(nestedLen);
            const nested = this.parsePayload(nestedBuf, scheme);
            compound.setCompound(key, nested);
            return;
        }
        if (type === NbtTypeId.CompoundArray) {
            const count = reader.readVarUint();
            const list: NbtCompound[] = [];
            for (let i = 0; i < count; i++) {
                const nestedLen = reader.readVarUint();
                const nestedBuf = reader.readSlice(nestedLen);
                const nested = this.parsePayload(nestedBuf, scheme);
                list.push(nested);
            }
            compound.setCompoundArray(key, list);
            return;
        }
        compound.set(key, NbtTypes.getTypeByIndex(type).read(reader));
    }

    public static fromSNbt(snbt: string): NbtCompound {
        const reader = new StringReader(snbt);
        reader.skipAnyWhitespace();
        reader.expect('{');
        return this.parseStringCompound(reader);
    }

    public static parseStringCompound(reader: StringReader): NbtCompound {
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
            compound.set(key, nbt);

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

    private static parseValue(reader: StringReader): NbtElement {
        reader.skipAnyWhitespace();

        // Compound
        if (reader.peek() === '{') {
            reader.skip();
            return this.parseStringCompound(reader);
        }

        // Array
        if (reader.peek() === '[') {
            reader.skip();
            return this.parseArray(reader);
        }

        // Boolean
        if (reader.canRead(4) && reader.getString().substring(reader.getCursor(), reader.getCursor() + 4) === 'true') {
            reader.setCursor(reader.getCursor() + 4);
            return NbtInt8.bool(true);
        }
        if (reader.canRead(5) && reader.getString().substring(reader.getCursor(), reader.getCursor() + 5) === 'false') {
            reader.setCursor(reader.getCursor() + 5);
            return NbtInt8.bool(false);
        }

        // String
        if (StringReader.isQuotedStringStart(reader.peek())) {
            const str = reader.readQuotedString();
            return NbtString.of(str);
        }

        // Number
        return this.parseNumber(reader) as NbtElement;
    }

    private static parseNumber(reader: StringReader, raw = false): NbtElement | number {
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
            if (this.VALIDA_NUMBER_PREFIX.includes(c)) {
                suffix = c;
                reader.skip();
            }
        }

        const num = Number(numStr);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${numStr}`);
        }

        if (raw) return num;
        switch (suffix) {
            case 'b':
                return NbtInt8.of(Math.round(num));
            case 's':
                return NbtInt16.of(Math.round(num));
            case 'u':
                return NbtUint32.of(Math.round(num));
            case 'f':
                return NbtFloat.of(num);
            case 'd':
                return NbtDouble.of(num);
            default:
                return Number.isInteger(num) ? NbtInt32.of(Math.round(num)) : NbtDouble.of(num);
        }
    }

    private static parseArray(reader: StringReader): NbtElement {
        reader.skipAnyWhitespace();

        if (reader.peek() === ']') {
            reader.skip();
            return new NbtInt32Array(new Int32Array(0));
        }

        const type = reader.peek().toUpperCase();
        if (this.VALIDA_NUMBER_PREFIX.includes(type)) {
            reader.skip();
            if (reader.peek() !== ';') {
                throw new Error(`Expected ';' in array at ${reader.getCursor()}`);
            }
            reader.skip();
            return this.parseNumArray(reader, type);
        }

        const items: NbtElement[] = [];
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
        const types = new Set(items.map(i => i.getType()));
        if (types.size === 0) {
            return new NbtInt32Array(new Int32Array(0));
        }

        if (types.size === 1) {
            const t = items[0].getType();
            if (t === NbtTypeId.Compound) {
                return new NbtCompoundArray(items as NbtCompound[]);
            }

            if (t === NbtTypeId.String) {
                const strings = (items as NbtString[])
                    .map(i => i.value);
                return new NbtStringArray(strings);
            }
        }

        console.warn('Mixed array types, falling back to NumberArray');

        const numType: number[] = [NbtTypeId.Int8, NbtTypeId.Int16, NbtTypeId.Int32, NbtTypeId.Uint32, NbtTypeId.Float, NbtTypeId.Double];
        const nums = items
            .filter(i => numType.includes(i.getType()))
            .map(num => (num as NbtDouble).value)
        return NbtDoubleArray.create(nums);
    }

    private static parseNumArray(reader: StringReader, type: string): NbtElement {
        const items: number[] = [];
        while (true) {
            const item = this.parseNumber(reader, true) as number;
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

        switch (type) {
            case "B":
                return NbtInt8Array.create(items);
            case "S":
                return NbtInt16Array.create(items);
            case "I":
                return NbtInt32Array.create(items);
            case "F":
                return NbtFloatArray.create(items);
            case "U":
                return NbtUint32Array.create(items);
            default:
                return NbtDoubleArray.create(items);
        }
    }
}