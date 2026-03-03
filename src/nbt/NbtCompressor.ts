import {NbtCompound} from "./element/NbtCompound.ts";
import {BinaryWriter} from "./BinaryWriter.ts";
import {NbtCompoundArray} from "./element/NbtCompoundArray.ts";
import {NbtTypeId} from "./NbtType.ts";
import type {NbtString} from "./element/NbtString.ts";
import type {NbtStringArray} from "./element/NbtStringArray.ts";
import type {KeyIndex} from "./NbtSerialization.ts";
import type {NbtElement} from "./element/NbtElement.ts";

type StringPoolEntry = {
    value: string;
    count: number;
    index: number;
}

export class NbtCompressor {
    public static toRootCompactBinary(compound: NbtCompound): Uint8Array<ArrayBuffer> {
        const writer = new BinaryWriter();

        writer.writeInt32(NbtCompound.MAGIC);
        writer.writeInt16(NbtCompound.VERSION);

        return this.toDeepCompactBinary(compound, writer);
    }

    public static toDeepCompactBinary(compound: NbtCompound, writer?: BinaryWriter): Uint8Array<ArrayBuffer> {
        if (!writer) writer = new BinaryWriter();

        const keyScheme = new Map<string, KeyIndex>();
        const stringPool = new Map<string, StringPoolEntry>();

        this.updateKeyScheme(compound, keyScheme);
        this.buildStringPool(compound, stringPool);

        const optimizedPool = stringPool
            .values()
            .filter(entry => {
                const len = entry.value.length;
                if (len === 0) return false;

                const count = entry.count;
                if (len <= 2) return count >= 4;
                if (len <= 5) return count >= 3;
                return count >= 2;
            })
            .toArray();

        writer.writeVarUint(optimizedPool.length);
        for (const entry of optimizedPool) {
            writer.writeString(entry.value);
        }

        writer.writeVarUint(keyScheme.size);
        for (const {key, type} of keyScheme.values()) {
            writer.writeString(key);
            writer.writeInt8(type);
        }

        // 创建一个查找用的 Map: string -> index (仅包含被压缩的字符串)
        const poolLookup = new Map<string, number>();
        optimizedPool.forEach(entry => {
            poolLookup.set(entry.value, entry.index);
        });

        if (keyScheme.size > 0 || optimizedPool.length > 0) {
            const dataBytes = this.writeWithDeepScheme(compound, keyScheme, poolLookup);
            writer.pushBytes(dataBytes);
        }

        writer.writeInt8(NbtTypeId.End);
        return writer.toUint8Array();
    }

    private static buildStringPool(element: NbtElement, pool: Map<string, StringPoolEntry>) {
        const type = element.getType();
        if (type === NbtTypeId.Compound) {
            for (const [, child] of (element as NbtCompound).getEntries()) {
                this.buildStringPool(child, pool);
            }
            return;
        }
        if (type === NbtTypeId.CompoundArray) {
            for (const child of (element as NbtCompoundArray).value) {
                this.buildStringPool(child, pool);
            }
            return;
        }
        if (type === NbtTypeId.String) {
            const str = (element as NbtString).value;
            if (!pool.has(str)) {
                pool.set(str, {value: str, count: 0, index: pool.size});
            }
            const entry = pool.get(str)!;
            entry.count++;
            return;
        }
        if (type === NbtTypeId.StringArray) {
            const arr = (element as NbtStringArray).value;
            for (const str of arr) {
                if (!pool.has(str)) {
                    pool.set(str, {value: str, count: 0, index: pool.size});
                }
                pool.get(str)!.count++;
            }
        }
    }

    private static writeWithDeepScheme(
        compound: NbtCompound,
        keyScheme: Map<string, KeyIndex>,
        poolLookup: Map<string, number>
    ): Uint8Array<ArrayBuffer> {
        const writer = new BinaryWriter();

        for (const [key, element] of compound.getEntries()) {
            const type = element.getType();

            const compositeKey = `${key}:${type}`;
            if (keyScheme.has(compositeKey)) {
                const index = keyScheme.get(compositeKey)!.index;
                writer.writeVarUint(index);
            } else {
                // 如果动态添加了未预知的 Key, 可能需要回退
                // 静态方案下, 这不应该发生
                continue;
            }

            if (type === NbtTypeId.Compound) {
                const nested = this.writeWithDeepScheme(element as NbtCompound, keyScheme, poolLookup);
                writer.writeVarUint(nested.length);
                writer.pushBytes(nested);
                continue;
            }

            if (type === NbtTypeId.CompoundArray) {
                const list = (element as NbtCompoundArray).value;
                writer.writeVarUint(list.length);
                for (const compound of list) {
                    const nested = this.writeWithDeepScheme(compound, keyScheme, poolLookup);
                    writer.writeVarUint(nested.length);
                    writer.pushBytes(nested);
                }
                continue;
            }

            if (type === NbtTypeId.String) {
                const strVal = (element as NbtString).value;
                if (poolLookup.has(strVal)) {
                    writer.writeInt8(1);
                    writer.writeVarUint(poolLookup.get(strVal)!);
                } else {
                    writer.writeInt8(0);
                    writer.writeString(strVal);
                }
                continue;
            }

            if (type === NbtTypeId.StringArray) {
                const list = (element as NbtStringArray).value as string[];
                writer.writeVarUint(list.length);
                for (const strVal of list) {
                    if (poolLookup.has(strVal)) {
                        writer.writeInt8(1);
                        writer.writeVarUint(poolLookup.get(strVal)!);
                    } else {
                        writer.writeInt8(0);
                        writer.writeString(strVal);
                    }
                }
                continue;
            }

            element.write(writer);
        }

        return writer.toUint8Array();
    }

    private static updateKeyScheme(compound: NbtCompound, scheme: Map<string, KeyIndex>) {
        if (compound.getSize() === 0) return;
        for (const [key, element] of compound.getEntries()) {
            const type = element.getType();
            const compositeKey = `${key}:${type}`;
            if (!scheme.has(compositeKey)) {
                scheme.set(compositeKey, {key, type, index: scheme.size});
            }
            if (type === NbtTypeId.Compound) {
                this.updateKeyScheme(element as NbtCompound, scheme);
            } else if (type === NbtTypeId.CompoundArray) {
                for (const compound of (element as NbtCompoundArray).value) {
                    this.updateKeyScheme(compound, scheme);
                }
            }
        }
    }
}