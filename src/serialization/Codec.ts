import type {NbtElement} from "../nbt/element/NbtElement.ts";
import type {DataResult} from "./result/DataResult.ts";

export interface Codec<A> {
    encode(value: A): NbtElement;

    decode(input: NbtElement): DataResult<A>;
}

export type Encoder<A> = (value: A) => NbtElement;

export type Decoder<A> = (input: NbtElement) => DataResult<A>;