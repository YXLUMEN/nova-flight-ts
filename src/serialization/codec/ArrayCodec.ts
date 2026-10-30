import type {Codec} from "../Codec.ts";
import type {NbtElement} from "../../nbt/element/NbtElement.ts";
import {MAX_INT} from "../../utils/math/math.ts";
import {DataResult} from "../DataResult.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NbtCompoundArray} from "../../nbt/element/NbtCompoundArray.ts";

export class ArrayCodec<T> implements Codec<T[]> {
    public readonly codec: Codec<T>;
    public readonly min: number;
    public readonly max: number;

    public constructor(elementCodec: Codec<T>, min: number = 0, max: number = MAX_INT) {
        if (min < 0) throw new RangeError('min must be a positive int');
        if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) throw new RangeError('min and max must be a int');
        if (min > max) throw new RangeError('max must larger than min');

        this.codec = elementCodec;
        this.min = min;
        this.max = max;
    }

    public encode(value: T[]): DataResult<NbtElement> {
        const length = value.length;
        if (length < this.min) {
            return ArrayCodec.tooShort(length, this.min);
        }
        if (length > this.max) {
            return ArrayCodec.tooLong(length, this.max);
        }

        const codec = this.codec;
        const array: NbtCompound[] = [];
        for (let i = 0; i < length; i++) {
            const element = codec.encode(value[i]);
            if (element.isOk()) {
                array.push(ArrayCodec.wrap(element.unwrap()));
            }
        }
        return DataResult.ok(new NbtCompoundArray(array));
    }

    public decode(input: NbtElement): DataResult<T[]> {
        if (!(input instanceof NbtCompoundArray)) {
            return DataResult.err(`Expected NbtCompoundArray, got ${input.type()}`);
        }

        const inputLen = input.value.length;
        if (inputLen < this.min) {
            return ArrayCodec.tooShort(inputLen, this.min);
        }

        const codec = this.codec;
        const length = Math.min(inputLen, this.max);
        const array: T[] = [];
        let failed = 0;

        for (const value of input.value) {
            const element = codec.decode(ArrayCodec.unwrap(value));
            const result = element.result();
            if (result.isPresent()) {
                array.push(result.get());
                continue;
            }
            failed++;
        }

        if (failed > 0) {
            return DataResult.err(() => `${this} success partially`, array);
        }
        if (length !== inputLen) {
            return ArrayCodec.tooLong<T[]>(length, this.max).setPartial(array);
        }

        return DataResult.ok(array);
    }

    public toString() {
        return `[ListCodec] ${this.codec}`;
    }

    private static wrap(element: NbtElement): NbtCompound {
        return element instanceof NbtCompound ? element : new NbtCompound().set('', element);
    }

    private static unwrap(element: NbtCompound) {
        if (element.size() === 1) {
            const inner = element.get('');
            return inner === null ? element : inner;
        }

        return element;
    }

    private static tooShort<T>(value: number, except: number) {
        return DataResult.err<T>(() => `Array too short "${value}", expected ${except}`);
    }

    private static tooLong<T>(value: number, except: number) {
        return DataResult.err<T>(() => `Array too long "${value}", expected max ${except}`);
    }
}