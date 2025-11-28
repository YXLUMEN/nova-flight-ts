import type {IVec} from "../../utils/math/IVec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {PacketCodec} from "./PacketCodec.ts";
import type {Registry} from "../../registry/Registry.ts";
import type {IndexedIterable} from "../../utils/collection/IndexedIterable.ts";
import {type BinaryReader} from "../../nbt/BinaryReader.ts";
import {type BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {BiConsumer, Constructor, FunctionReturn} from "../../apis/types.ts";

export class PacketCodecs {
    public static readonly BOOL: PacketCodec<boolean> = PacketCodecs.of(
        (writer, value) => writer.writeByte(value ? 1 : 0),
        reader => reader.readByte() !== 0
    );

    public static readonly BYTE: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeByte(value),
        reader => reader.readByte()
    );

    public static readonly INT16: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeInt16(value),
        reader => reader.readInt16()
    );

    public static readonly INT32: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeInt32(value),
        reader => reader.readInt32()
    );

    public static readonly UINT32: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeUint32(value),
        reader => reader.readUint32()
    );

    public static readonly FLOAT: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeFloat(value),
        reader => reader.readFloat()
    );

    public static readonly DOUBLE: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeDouble(value),
        reader => reader.readDouble()
    );

    public static readonly VAR_INT: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeVarUInt(value),
        reader => reader.readVarUInt()
    );

    public static readonly STRING: PacketCodec<string> = PacketCodecs.of(
        (writer, value) => writer.writeString(value),
        reader => reader.readString()
    );

    public static readonly VECTOR2D: PacketCodec<IVec> = PacketCodecs.of(
        (writer, value) => {
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
        },
        reader => new Vec2(reader.readDouble(), reader.readDouble())
    );

    public static of<T>(
        encoder: BiConsumer<BinaryWriter, T>,
        decoder: (reader: BinaryReader) => T
    ): PacketCodec<T> {
        return {
            encode(writer: BinaryWriter, value: T): void {
                encoder(writer, value);
            },
            decode: decoder
        }
    }

    public static empty<T>(decoder: Constructor<T>): PacketCodec<T> {
        return {
            encode(): void {
            },
            decode(): T {
                return new decoder();
            }
        }
    }

    public static collection<V>(elementCodec: PacketCodec<V>, maxSize: number = 2147483647): PacketCodec<V[]> {
        return PacketCodecs.of<V[]>(
            (writer, values) => {
                this.writeCollectionSize(writer, values.length, maxSize);
                for (const v of values) {
                    elementCodec.encode(writer, v);
                }
            },
            reader => {
                const size = this.readCollectionSize(reader, maxSize);
                const result: V[] = new Array(size);
                for (let i = 0; i < size; i++) {
                    result[i] = elementCodec.decode(reader);
                }
                return result;
            }
        );
    }

    public static collectionSet<V>(elementCodec: PacketCodec<V>, maxSize: number = 2147483647): PacketCodec<Set<V>> {
        return PacketCodecs.of<Set<V>>(
            (writer, values) => {
                this.writeCollectionSize(writer, values.size, maxSize);
                for (const v of values) {
                    elementCodec.encode(writer, v);
                }
            },
            reader => {
                const size = this.readCollectionSize(reader, maxSize);
                const result = new Set<V>();
                for (let i = 0; i < size; i++) {
                    result.add(elementCodec.decode(reader));
                }
                return result;
            }
        );
    }

    private static readCollectionSize(reader: BinaryReader, maxSize: number): number {
        const size = reader.readVarUInt();
        if (size > maxSize) {
            throw new Error(`${size} elements exceeded max size of: ${maxSize}`);
        }
        return size;
    }

    private static writeCollectionSize(writer: BinaryWriter, size: number, maxSize: number): void {
        if (size > maxSize) {
            throw new Error(`${size} elements exceeded max size of: ${maxSize}`);
        }
        writer.writeVarUInt(size);
    }

    public static registryEntry<T>(registry: Registry<T>): PacketCodec<T> {
        return this.registry(registry, (r) => r.getIndexedEntries());
    }

    public static registry<T, R>(
        registry: Registry<T>,
        registryTransformer: FunctionReturn<Registry<T>, IndexedIterable<R>>
    ): PacketCodec<R> {
        return {
            encode(writer: BinaryWriter, object: R): Uint8Array<ArrayBufferLike> {
                const iterable = registryTransformer(registry);
                const id = iterable.getRawId(object);
                if (id === undefined) throw new Error(`Object not registered`);
                writer.writeVarUInt(id);
                return writer.toUint8Array();
            },
            decode(reader: BinaryReader): R {
                const i = reader.readVarUInt();
                const iterable = registryTransformer(registry);
                const value = iterable.get(i);
                if (value === null) throw new Error(`No entry at index ${i}`);
                return value;
            }
        } satisfies PacketCodec<R>;
    }
}