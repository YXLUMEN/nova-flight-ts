import type {Codec, Decoder, Encoder} from "./Codec.ts";
import {DataResult} from "./result/DataResult.ts";
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
import {NbtCompoundArray} from "../nbt/element/NbtCompoundArray.ts";
import {NbtEnd} from "../nbt/element/NbtEnd.ts";
import {CodecImpl} from "./codec/CodecImpl.ts";
import {FieldCodec} from "./codec/FieldCodec.ts";
import {OptionalFieldCodec} from "./codec/OptionalFieldCodec.ts";
import {GroupBuilder} from "./codec/GroupBuilder.ts";
import type {BoundField} from "./codec/BoundField.ts";
import type {MapCodec} from "./MapCodec.ts";
import {Optional} from "../utils/Optional.ts";
import type {Return} from "../type/types.ts";
import {Vec2} from "../utils/math/Vec2.ts";


export class Codecs {
    public static readonly INT8: Codec<number> = Codecs.of(
        value => NbtInt8.of(value),
        input => input instanceof NbtInt8
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtInt8, got ${input.getType()}`)
    );

    public static readonly INT16: Codec<number> = Codecs.of(
        value => NbtInt16.of(value),
        input => input instanceof NbtInt16
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtInt16, got ${input.getType()}`)
    );

    public static readonly INT32: Codec<number> = Codecs.of(
        value => NbtInt32.of(value),
        input => input instanceof NbtInt32
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtInt32, got ${input.getType()}`)
    );

    public static readonly UINT32: Codec<number> = Codecs.of(
        value => NbtUint32.of(value),
        input => input instanceof NbtUint32
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtUint32, got ${input.getType()}`)
    );

    public static readonly FLOAT: Codec<number> = Codecs.of(
        value => NbtFloat.of(value),
        input => input instanceof NbtFloat
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtFloat, got ${input.getType()}`)
    );

    public static readonly DOUBLE: Codec<number> = Codecs.of(
        value => NbtDouble.of(value),
        input => input instanceof NbtDouble
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtDouble, got ${input.getType()}`)
    );

    public static readonly STRING: Codec<string> = Codecs.of(
        value => NbtString.of(value),
        input => input instanceof NbtString
            ? DataResult.success(input.value)
            : DataResult.error(`Expected NbtString, got ${input.getType()}`)
    );

    public static readonly BOOLEAN: Codec<boolean> = Codecs.of(
        value => NbtInt8.bool(value),
        input => input instanceof NbtInt8
            ? DataResult.success(input.value !== 0)
            : DataResult.error(`Expected NbtInt8, got ${input.getType()}`)
    );

    public static readonly NBT_COMPOUND: Codec<NbtCompound> = Codecs.of(
        value => value,
        input => input instanceof NbtCompound
            ? DataResult.success(input)
            : DataResult.error(`Expected NbtCompound, got ${input.getType()}`)
    );

    public static readonly INT8_ARRAY: Codec<number[]> = Codecs.of(
        value => NbtInt8Array.create(value),
        input => input instanceof NbtInt8Array
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtInt8Array, got ${input.getType()}`)
    );

    public static readonly INT16_ARRAY: Codec<number[]> = Codecs.of(
        value => NbtInt16Array.create(value),
        input => input instanceof NbtInt16Array
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtInt16Array, got ${input.getType()}`)
    );

    public static readonly INT32_ARRAY: Codec<number[]> = Codecs.of(
        value => NbtInt32Array.create(value),
        input => input instanceof NbtInt32Array
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtInt32Array, got ${input.getType()}`)
    );

    public static readonly FLOAT_ARRAY: Codec<number[]> = Codecs.of(
        value => NbtFloatArray.create(value),
        input => input instanceof NbtFloatArray
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtFloatArray, got ${input.getType()}`)
    );

    public static readonly DOUBLE_ARRAY: Codec<number[]> = Codecs.of(
        value => NbtDoubleArray.create(value),
        input => input instanceof NbtDoubleArray
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtDoubleArray, got ${input.getType()}`)
    );

    public static readonly STRING_ARRAY: Codec<string[]> = Codecs.of(
        value => new NbtStringArray(value),
        input => input instanceof NbtStringArray
            ? DataResult.success(Array.from(input.value))
            : DataResult.error(`Expected NbtStringArray, got ${input.getType()}`)
    );

    public static readonly VEC2: Codec<Vec2> = Codecs.map(Codecs.DOUBLE_ARRAY,
        val => new Vec2(val[0], val[1]),
        val => [val.x, val.y]
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

    public static optional<T>(codec: Codec<T>): Codec<Optional<T>> {
        return Codecs.of(
            value => value.isPresent() ? codec.encode(value.get()) : NbtEnd.INSTANCE,
            input => input === NbtEnd.INSTANCE
                ? DataResult.success(Optional.empty())
                : codec.decode(input).map(v => Optional.of(v)),
            `${codec} [optional]`
        );
    }

    public static listOf<A>(elementCodec: Codec<A>): Codec<A[]> {
        return Codecs.of(
            (list) => {
                const compounds: NbtCompound[] = new Array(list.length).fill(null);
                for (let i = 0; i < list.length; i++) {
                    const element = elementCodec.encode(list[i]);
                    if (element instanceof NbtCompound) {
                        compounds[i] = element;
                        continue;
                    }
                    throw new TypeError(
                        `listOf(${elementCodec}) element must encode to NbtCompound, got ${element.getType()}`
                    );
                }
                return new NbtCompoundArray(compounds);
            },
            (input) => {
                if (!(input instanceof NbtCompoundArray)) {
                    return DataResult.error(`Expected NbtCompoundArray, got ${input.getType()}`);
                }

                const list: A[] = new Array(input.value.length).fill(null);
                for (let i = 0; i < input.value.length; i++) {
                    const element = elementCodec.decode(input.value[i]);
                    const result = element.result();
                    if (result.isEmpty()) {
                        return DataResult.error(() =>
                            `listOf(${elementCodec}) element ${i}: ${element.error().get().message()}`
                        );
                    }
                    list[i] = result.get();
                }
                return DataResult.success(list);
            },
            `${elementCodec} [listOf]`
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
