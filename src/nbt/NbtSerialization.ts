import {NbtCompound} from "./NbtCompound.ts";
import {NbtTypes} from "./NbtValue.ts";
import {BinaryWriter} from "./BinaryWriter.ts";

type KeyIndex = Readonly<{ key: string, type: number, index: number }>;

export class NbtSerialization {
    public static toRootBinary(compound: NbtCompound): Uint8Array<ArrayBuffer> {
        const writer = new BinaryWriter();

        writer.writeInt32(NbtCompound.MAGIC);
        writer.writeInt16(NbtCompound.VERSION);

        return this.toBinary(compound, writer);
    }

    public static toBinary(compound: NbtCompound, writer?: BinaryWriter): Uint8Array<ArrayBuffer> {
        if (!writer) {
            writer = new BinaryWriter();
        }

        for (const [key, {type, value}] of compound.getEntries()) {
            writer.writeInt8(type);
            writer.writeString(key);

            switch (type) {
                case NbtTypes.Int8:
                    writer.writeInt8(value as number);
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
                    writer.writeInt8(value ? 1 : 0);
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
                    const compound = value as NbtCompound;
                    const nested = this.toBinary(compound);
                    writer.writeVarUint(nested.length);
                    writer.pushBytes(nested);
                    break;
                }
                case NbtTypes.NbtList: {
                    const list = value as NbtCompound[];
                    writer.writeVarUint(list.length);
                    for (const compound of list) {
                        const nested = this.toBinary(compound);
                        writer.writeVarUint(nested.length);
                        writer.pushBytes(nested);
                    }
                    break;
                }
            }
        }

        writer.writeInt8(NbtTypes.End);
        return writer.toUint8Array();
    }

    public static toRootCompactBinary(compound: NbtCompound): Uint8Array<ArrayBuffer> {
        const writer = new BinaryWriter();

        writer.writeInt32(NbtCompound.MAGIC);
        writer.writeInt16(NbtCompound.VERSION);

        return this.toCompactBinary(compound, writer);
    }

    public static toCompactBinary(compound: NbtCompound, writer?: BinaryWriter): Uint8Array<ArrayBuffer> {
        if (!writer) writer = new BinaryWriter();
        const scheme = new Map<string, KeyIndex>();

        this.updateScheme(compound, scheme);

        writer.writeVarUint(scheme.size);
        for (const {key, type} of scheme.values()) {
            writer.writeString(key);
            writer.writeInt8(type);
        }

        if (scheme.size > 0) {
            writer.pushBytes(this.writeWithScheme(compound, scheme));
        }

        writer.writeInt8(NbtTypes.End);
        return writer.toUint8Array();
    }

    private static writeWithScheme(compound: NbtCompound, scheme: Map<string, KeyIndex>) {
        const writer = new BinaryWriter();

        for (const [key, {type, value}] of compound.getEntries()) {
            const index = scheme.get(`${key}:${type}`)!.index;
            writer.writeVarUint(index);

            switch (type) {
                case NbtTypes.Int8:
                    writer.writeInt8(value as number);
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
                    writer.writeInt8(value ? 1 : 0);
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
                    const compound = value as NbtCompound;
                    const nested = this.writeWithScheme(compound, scheme);
                    writer.writeVarUint(nested.length);
                    writer.pushBytes(nested);
                    break;
                }
                case NbtTypes.NbtList: {
                    const list = value as NbtCompound[];
                    writer.writeVarUint(list.length);
                    for (const compound of list) {
                        const nested = this.writeWithScheme(compound, scheme);
                        writer.writeVarUint(nested.length);
                        writer.pushBytes(nested);
                    }
                    break;
                }
            }
        }

        return writer.toUint8Array();
    }

    private static updateScheme(compound: NbtCompound, scheme: Map<string, KeyIndex>) {
        if (compound.getSize() === 0) return;

        for (const [key, {type, value}] of compound.getEntries()) {
            // 避免键同类型不同
            const compositeKey = `${key}:${type}`;
            if (!scheme.has(compositeKey)) {
                scheme.set(compositeKey, {key, type, index: scheme.size});
            }

            switch (type) {
                case NbtTypes.Compound: {
                    this.updateScheme(value as NbtCompound, scheme);
                    break;
                }
                case NbtTypes.NbtList: {
                    const values = value as NbtCompound[];
                    for (const compound of values) {
                        this.updateScheme(compound, scheme);
                    }
                    break;
                }
            }
        }
    }

    public static toSNbt(compound: NbtCompound, pretty = false, indent = 0): string {
        const entries: string[] = [];
        const spacing = pretty ? ' '.repeat(indent) : '';
        const newline = pretty ? '\n' : '';
        const innerIndent = pretty ? ' '.repeat(indent + 2) : '';

        const reg = /^[a-zA-Z0-9_]+$/;

        for (const [key, {type, value}] of compound.getEntries()) {
            const safeKey = reg.test(key) ? `"${key}"` : `"${key.replace(/"/g, '\\"')}"`;

            let valStr: string;
            switch (type) {
                case NbtTypes.Int8:
                    valStr = `${value}b`;
                    break;
                case NbtTypes.Int16:
                    valStr = `${value}s`;
                    break;
                case NbtTypes.Int32:
                    valStr = `${value}`;
                    break;
                case NbtTypes.Uint:
                    valStr = `${value}u`;
                    break;
                case NbtTypes.Float:
                    valStr = `${value}f`;
                    break;
                case NbtTypes.Double:
                    valStr = `${value}d`;
                    break;
                case NbtTypes.Boolean:
                    valStr = value ? 'true' : 'false';
                    break;
                case NbtTypes.String:
                    const escapedStr = value
                        .toString()
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"');
                    valStr = `"${escapedStr}"`;
                    break;
                case NbtTypes.NumberArray:
                    const arrayItems = (value as number[])
                        .join(',');
                    valStr = `[${arrayItems}]`;
                    break;
                case NbtTypes.StringArray:
                    const items = (value as string[])
                        .map(s => `"${s.replace(/"/g, '\\"')}"`)
                        .join(',');
                    valStr = `[${items}]`;
                    break;
                case NbtTypes.Compound:
                    valStr = this.toSNbt((value as NbtCompound), pretty, indent + 2);
                    break;
                case NbtTypes.NbtList:
                    const listItems = (value as NbtCompound[])
                        .map(comp => this.toSNbt(comp, pretty))
                        .join(',');
                    valStr = `[${listItems}]`;
                    break;
                default:
                    valStr = '"<unsupported>"';
            }
            entries.push(`${innerIndent}${safeKey}:${valStr}`);
        }

        if (entries.length === 0) {
            return '{}';
        }
        return `{${newline}${entries.join(`,${newline}`)}${newline}${spacing}}`;
    }
}