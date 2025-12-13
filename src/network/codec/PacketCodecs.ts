import type {IVec} from "../../utils/math/IVec.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {PacketCodec} from "./PacketCodec.ts";
import type {Registry} from "../../registry/Registry.ts";
import type {IndexedIterable} from "../../utils/collection/IndexedIterable.ts";
import {type BinaryReader} from "../../nbt/BinaryReader.ts";
import {type BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {Constructor, FunctionReturn, Supplier, UUID} from "../../apis/types.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {createClean} from "../../utils/uit.ts";
import {Optional} from "../../utils/Optional.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";
import {decodeColorHex, encodeColorHex} from "../../utils/NetUtil.ts";

export class PacketCodecs {
    public static readonly INT8: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeInt8(value),
        reader => reader.readInt8()
    );

    public static readonly UINT8: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeInt8(value),
        reader => reader.readUint8()
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

    public static readonly VAR_UINT: PacketCodec<number> = PacketCodecs.of(
        (writer, value) => writer.writeVarUint(value),
        reader => reader.readVarUint()
    );

    public static readonly BOOL: PacketCodec<boolean> = PacketCodecs.of(
        (writer, value) => writer.writeBoolean(value),
        reader => reader.readBoolean()
    );

    public static readonly STRING: PacketCodec<string> = PacketCodecs.of(
        (writer, value) => writer.writeString(value),
        reader => reader.readString()
    );

    public static readonly UUID: PacketCodec<UUID> = PacketCodecs.of(
        (writer, value) => writer.writeUUID(value),
        reader => reader.readUUID()
    );

    public static readonly NBT: PacketCodec<NbtCompound> = PacketCodecs.of(
        (writer, value) => writer.pushBytes(value.toBinary()),
        reader => NbtCompound.fromReader(reader)
    );

    public static readonly COLOR_HEX: PacketCodec<string> = PacketCodecs.of(
        (writer, value) => writer.writeUint32(encodeColorHex(value)),
        reader => decodeColorHex(reader.readUint32())
    );

    public static readonly VECTOR2F: PacketCodec<IVec> = PacketCodecs.of(
        (writer, value) => {
            writer.writeFloat(value.x);
            writer.writeFloat(value.y);
        },
        reader => new Vec2(reader.readFloat(), reader.readFloat())
    );

    public static readonly VECTOR2D: PacketCodec<IVec> = PacketCodecs.of(
        (writer, value) => {
            writer.writeDouble(value.x);
            writer.writeDouble(value.y);
        },
        reader => new Vec2(reader.readDouble(), reader.readDouble())
    );

    public static of<T>(
        encoder: (writer: BinaryWriter, value: T) => void,
        decoder: (reader: BinaryReader) => T
    ): PacketCodec<T> {
        return createClean({
            encode: encoder,
            decode: decoder
        });
    }

    /**
     * Codec that writes nothing and reconstructs an object via new T(). Requires a no-arg constructor.
     * */
    public static emptyNew<T>(decoder: Constructor<T>): PacketCodec<T> {
        return createClean({
            encode(): void {
            },
            decode(): T {
                return new decoder();
            }
        });
    }

    /**
     * Like emptyNew, but uses a factory function instead of new
     * */
    public static empty<T>(decoder: Supplier<T>): PacketCodec<T> {
        return createClean({
            encode() {
            },
            decode: decoder
        });
    }

    public static optional<T>(codec: PacketCodec<T>): PacketCodec<Optional<T>> {
        return createClean({
            encode(writer: BinaryWriter, optional: Optional<T>) {
                if (optional.isPresent()) {
                    writer.writeBoolean(true);
                    codec.encode(writer, optional.get());
                } else {
                    writer.writeBoolean(false);
                }
            },
            decode(reader: BinaryReader): Optional<T> {
                return reader.readBoolean() ? Optional.of(codec.decode(reader)) : Optional.empty();
            }
        });
    }

    public static collection<V>(elementCodec: PacketCodec<V>, maxSize: number = 2147483647): PacketCodec<V[]> {
        return createClean({
            encode(writer: BinaryWriter, array: V[]) {
                PacketCodecs.writeCollectionSize(writer, array.length, maxSize);
                for (const v of array) {
                    elementCodec.encode(writer, v);
                }
            },
            decode(reader: BinaryReader): V[] {
                const size = PacketCodecs.readCollectionSize(reader, maxSize);
                const list: V[] = new Array(size);
                for (let i = 0; i < size; i++) {
                    list[i] = elementCodec.decode(reader);
                }
                return list;
            }
        });
    }

    public static collectionSet<V>(elementCodec: PacketCodec<V>, maxSize: number = 2147483647): PacketCodec<Set<V>> {
        return createClean({
            encode(writer: BinaryWriter, set: Set<V>) {
                PacketCodecs.writeCollectionSize(writer, set.size, maxSize);
                for (const v of set) {
                    elementCodec.encode(writer, v);
                }
            },
            decode(reader: BinaryReader): Set<V> {
                const size = PacketCodecs.readCollectionSize(reader, maxSize);
                const set = new Set<V>();
                for (let i = 0; i < size; i++) {
                    set.add(elementCodec.decode(reader));
                }
                return set;
            }
        });
    }

    public static map<K, V, M extends Map<K, V>>(
        constructor: Constructor<M>, keyCodec: PacketCodec<K>, valueCodec: PacketCodec<V>, maxSize: number = 2147483647
    ): PacketCodec<M> {
        return createClean({
            encode(writer: BinaryWriter, map: M) {
                PacketCodecs.writeCollectionSize(writer, map.size, maxSize);
                for (const [key, value] of map) {
                    keyCodec.encode(writer, key);
                    valueCodec.encode(writer, value);
                }
            },
            decode(reader: BinaryReader): M {
                const size = PacketCodecs.readCollectionSize(reader, maxSize);
                const map: M = new constructor();
                for (let i = 0; i < size; i++) {
                    map.set(keyCodec.decode(reader), valueCodec.decode(reader));
                }
                return map;
            }
        });
    }

    private static readCollectionSize(reader: BinaryReader, maxSize: number): number {
        const size = reader.readVarUint();
        if (size > maxSize) {
            throw new Error(`${size} elements exceeded max size of: ${maxSize}`);
        }
        return size;
    }

    private static writeCollectionSize(writer: BinaryWriter, size: number, maxSize: number): void {
        if (size > maxSize) {
            throw new Error(`${size} elements exceeded max size of: ${maxSize}`);
        }
        writer.writeVarUint(size);
    }

    /**
     * Codec for RegistryEntry<T>, serialized by numeric ID.
     * */
    public static registryEntry<T>(registry: Registry<T>): PacketCodec<RegistryEntry<T>> {
        return this.registry(registry, r => r.getIndexedEntries());
    }

    /**
     * Codec for raw registry values (T), serialized by numeric ID.
     * */
    public static registryValue<T>(registry: Registry<T>): PacketCodec<T> {
        return this.registry(registry, r => r);
    }

    public static registry<T, R>(
        registry: Registry<T>,
        registryTransformer: FunctionReturn<Registry<T>, IndexedIterable<R>>
    ): PacketCodec<R> {
        return createClean({
            encode(writer: BinaryWriter, object: R): void {
                const iterable = registryTransformer(registry);
                const id = iterable.getIndex(object) ?? null;
                if (id === null) throw new Error(`Object not registered`);
                writer.writeVarUint(id);
            },
            decode(reader: BinaryReader): R {
                const i = reader.readVarUint();
                const iterable = registryTransformer(registry);
                const value = iterable.getByIndex(i);
                if (value === null) throw new Error(`No entry at index ${i}`);
                return value;
            }
        });
    }

    /**
     * Projects type C to T1 for encoding,
     * then reconstructs C on decode. Ideal for single-field extraction.
     * */
    public static adapt<C, T1>(codec: PacketCodec<T1>, from: FunctionReturn<C, T1>, to: FunctionReturn<T1, C>): PacketCodec<C> {
        return createClean({
            encode(writer: BinaryWriter, value: C) {
                codec.encode(writer, from(value));
            },
            decode(reader: BinaryReader): C {
                return to(codec.decode(reader));
            }
        });
    }

    public static adapt2<C, T1, T2>(
        codec1: PacketCodec<T1>, from1: FunctionReturn<C, T1>,
        codec2: PacketCodec<T2>, from2: FunctionReturn<C, T2>,
        to: (v1: T1, v2: T2) => C): PacketCodec<C> {
        return createClean({
            encode(writer: BinaryWriter, value: C) {
                codec1.encode(writer, from1(value));
                codec2.encode(writer, from2(value));
            },
            decode(reader: BinaryReader): C {
                return to(
                    codec1.decode(reader),
                    codec2.decode(reader),
                );
            }
        });
    }

    /**
     * Use sparingly. Prefer "of".
     *
     * @see {@link PacketCodecs.of()}
     * */
    public static adapt3<C, T1, T2, T3>(
        codec1: PacketCodec<T1>, from1: FunctionReturn<C, T1>,
        codec2: PacketCodec<T2>, from2: FunctionReturn<C, T2>,
        codec3: PacketCodec<T3>, from3: FunctionReturn<C, T3>,
        to: (v1: T1, v2: T2, v3: T3) => C): PacketCodec<C> {
        return createClean({
            encode(writer: BinaryWriter, value: C) {
                codec1.encode(writer, from1(value));
                codec2.encode(writer, from2(value));
                codec3.encode(writer, from3(value));
            },
            decode(reader: BinaryReader): C {
                return to(
                    codec1.decode(reader),
                    codec2.decode(reader),
                    codec3.decode(reader),
                );
            }
        });
    }

    /**
     * @danger Creates a codec by reflecting on public field names.
     *
     * ONLY use for plain data classes with:
     *  - Public, writable, non-method fields
     *  - Better a no-arg constructor (`new C()`)
     *  - Stable field names (no renaming in production)
     *
     *  Type safety is NOT guaranteed. Field order = wire order.
     *
     *  **Recommended only for**: simple DTOs, internal tools, or development prototyping.
     *
     *  @see {@link PacketCodecs.of()}
     *  @see {@link PacketCodecs.adapt()}
     * */
    public static reflection<T extends Object>(
        constructor: Constructor<T>,
        fieldCodecs: { [K in keyof T]?: PacketCodec<T[K]> }
    ): PacketCodec<T> {
        const entries = Object.entries(fieldCodecs) as [keyof T, PacketCodec<any>][];
        if (entries.length === 0) {
            throw new Error('Reflection fieldCodecs cannot be empty');
        }

        return createClean({
            encode(writer: BinaryWriter, object: T) {
                for (const [key, codec] of entries) {
                    const value = object[key];
                    if (value === undefined) {
                        throw new Error(`[PacketCodecs.reflection] Field "${String(key)}" is undefined on ${object}`);
                    }
                    codec.encode(writer, value);
                }
            },
            decode(reader: BinaryReader): T {
                const instance = new constructor();
                for (const [key, codec] of entries) {
                    instance[key] = codec.decode(reader);
                }
                return instance;
            }
        });
    }
}