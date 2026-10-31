import type {Codec, Decoder, Encoder} from "./Codec.ts";
import type {BoundField} from "./codec/BoundField.ts";
import type {MapCodec} from "./MapCodec.ts";
import type {Return} from "../type/types.ts";
import type {Registry} from "../registry/Registry.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {DataResult} from "./DataResult.ts";
import {CodecImpl} from "./codec/CodecImpl.ts";
import {FieldCodec} from "./codec/FieldCodec.ts";
import {OptionalFieldCodec} from "./codec/OptionalFieldCodec.ts";
import {GroupBuilder} from "./codec/GroupBuilder.ts";
import {ArrayCodec} from "./codec/ArrayCodec.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Optional} from "../utils/Optional.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import {NbtInt8} from "../nbt/element/NbtInt8.ts";
import {NbtInt16} from "../nbt/element/NbtInt16.ts";
import {NbtInt32} from "../nbt/element/NbtInt32.ts";
import {NbtUint32} from "../nbt/element/NbtUint32.ts";
import {NbtFloat} from "../nbt/element/NbtFloat.ts";
import {NbtDouble} from "../nbt/element/NbtDouble.ts";
import {NbtString} from "../nbt/element/NbtString.ts";
import {NbtInt8Array} from "../nbt/element/NbtInt8Array.ts";
import {NbtInt16Array} from "../nbt/element/NbtInt16Array.ts";
import {NbtInt32Array} from "../nbt/element/NbtInt32Array.ts";
import {NbtFloatArray} from "../nbt/element/NbtFloatArray.ts";
import {NbtDoubleArray} from "../nbt/element/NbtDoubleArray.ts";
import {NbtStringArray} from "../nbt/element/NbtStringArray.ts";
import {NbtEnd} from "../nbt/element/NbtEnd.ts";

export class Codecs {
    public static readonly INT8: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtInt8.of(value)),
        input => input instanceof NbtInt8
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtInt8, got ${input.type()}`)
    );

    public static readonly INT16: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtInt16.of(value)),
        input => input instanceof NbtInt16
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtInt16, got ${input.type()}`)
    );

    public static readonly INT32: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtInt32.of(value)),
        input => input instanceof NbtInt32
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtInt32, got ${input.type()}`)
    );

    public static readonly UINT32: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtUint32.of(value)),
        input => input instanceof NbtUint32
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtUint32, got ${input.type()}`)
    );

    public static readonly FLOAT: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtFloat.of(value)),
        input => input instanceof NbtFloat
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtFloat, got ${input.type()}`)
    );

    public static readonly DOUBLE: Codec<number> = Codecs.of(
        value => DataResult.ok(NbtDouble.of(value)),
        input => input instanceof NbtDouble
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtDouble, got ${input.type()}`)
    );

    public static readonly STRING: Codec<string> = Codecs.of(
        value => DataResult.ok(NbtString.of(value)),
        input => input instanceof NbtString
            ? DataResult.ok(input.value)
            : DataResult.err(`Expected NbtString, got ${input.type()}`)
    );

    public static readonly BOOLEAN: Codec<boolean> = Codecs.of(
        value => DataResult.ok(NbtInt8.bool(value)),
        input => input instanceof NbtInt8
            ? DataResult.ok(input.value !== 0)
            : DataResult.err(`Expected NbtInt8, got ${input.type()}`)
    );

    public static readonly NBT_COMPOUND: Codec<NbtCompound> = Codecs.of(
        value => DataResult.ok(value),
        input => input instanceof NbtCompound
            ? DataResult.ok(input)
            : DataResult.err(`Expected NbtCompound, got ${input.type()}`)
    );

    public static readonly INT8_ARRAY: Codec<number[]> = Codecs.of(
        value => DataResult.ok(NbtInt8Array.create(value)),
        input => input instanceof NbtInt8Array
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtInt8Array, got ${input.type()}`)
    );

    public static readonly INT16_ARRAY: Codec<number[]> = Codecs.of(
        value => DataResult.ok(NbtInt16Array.create(value)),
        input => input instanceof NbtInt16Array
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtInt16Array, got ${input.type()}`)
    );

    public static readonly INT32_ARRAY: Codec<number[]> = Codecs.of(
        value => DataResult.ok(NbtInt32Array.create(value)),
        input => input instanceof NbtInt32Array
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtInt32Array, got ${input.type()}`)
    );

    public static readonly FLOAT_ARRAY: Codec<number[]> = Codecs.of(
        value => DataResult.ok(NbtFloatArray.create(value)),
        input => input instanceof NbtFloatArray
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtFloatArray, got ${input.type()}`)
    );

    public static readonly DOUBLE_ARRAY: Codec<number[]> = Codecs.of(
        value => DataResult.ok(NbtDoubleArray.create(value)),
        input => input instanceof NbtDoubleArray
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtDoubleArray, got ${input.type()}`)
    );

    public static readonly STRING_ARRAY: Codec<string[]> = Codecs.of(
        value => DataResult.ok(new NbtStringArray(value)),
        input => input instanceof NbtStringArray
            ? DataResult.ok(Array.from(input.value))
            : DataResult.err(`Expected NbtStringArray, got ${input.type()}`)
    );

    public static of<A>(encoder: Encoder<A>, decoder: Decoder<A>, name?: string): Codec<A> {
        if (!name) name = `Codec["${encoder}":"${decoder}"]`;
        return new CodecImpl(encoder, decoder, name);
    }

    public static map<A, B>(codec: Codec<A>, to: Return<A, B>, from: Return<B, A>): Codec<B> {
        return Codecs.of(
            value => codec.encode(from(value)),
            input => codec.decode(input).map(to),
            `${codec} [map]`
        );
    }

    public static optional<A>(codec: Codec<A>): Codec<Optional<A>> {
        return Codecs.of(
            value => value.isPresent() ? codec.encode(value.get()) : DataResult.ok(NbtEnd.INSTANCE),
            input => input === NbtEnd.INSTANCE
                ? DataResult.ok(Optional.empty())
                : codec.decode(input).map(v => Optional.of(v)),
            `${codec} [optional]`
        );
    }

    /** 将单个解析器映射为数组解析器.
     * > 如果是基础类型,推荐使用对应的数组类型以减少临时对象
     * */
    public static listOf<A>(elementCodec: Codec<A>, min?: number, max?: number): Codec<A[]> {
        return new ArrayCodec(elementCodec, min, max);
    }

    public static registry<A>(registry: Registry<A>): Codec<RegistryEntry<A>> {
        return Codecs.of(
            value => {
                return Identifier.CODEC.encode(value.getRegistryKey().getValue());
            },
            input => {
                const result = Identifier.CODEC.decode(input)
                    .map(id => registry.getEntryById(id));
                if (result.isOk()) {
                    const entry = result.unwrap();
                    if (entry) return DataResult.ok(entry);
                }
                return DataResult.err(`Unknown registry key in ${registry.getKey()}`);
            }
        );
    }

    public static registryValue<A>(registry: Registry<A>): Codec<A> {
        return Codecs.of(
            value => {
                const id = registry.getId(value);
                if (!id) return DataResult.err(() => `Value doesn't register: "${value}"`);
                return Identifier.CODEC.encode(id);
            },
            input => {
                const result = Identifier.CODEC.decode(input)
                    .map(id => registry.getById(id));
                if (result.isOk()) {
                    const entry = result.unwrap();
                    if (entry) return DataResult.ok(entry);
                }
                return DataResult.err(() => `Unknown registry key in ${registry.getKey()}`);
            }
        );
    }

    public static field<A>(key: string, codec: Codec<A>): MapCodec<A> {
        return new FieldCodec(key, codec);
    }

    public static optionalField<A>(key: string, codec: Codec<A>): MapCodec<Optional<A>> {
        return new OptionalFieldCodec(key, codec);
    }

    /**
     * 结构体 codec（链式）：
     * Codecs.group<C>(Codecs.field('id', Identifier.CODEC).for(v => v.id), ...).apply(Constructor)
     * 每个字段经 .for(...) 绑定取值器（编码时从 C 取值），
     * apply 的构造函数参数按字段顺序一一对应（解码时组装 C）。
     * optionalField 字段的值类型是 Optional<T>，可配合 forNullable 传裸值。
     */
    public static group<C, F extends readonly BoundField<C, any>[] = readonly BoundField<C, any>[]>(
        ...fields: F
    ): GroupBuilder<C, { [K in keyof F]: F[K] extends BoundField<C, infer V> ? V : never }> {
        return new GroupBuilder(fields);
    }
}
