import type {Codec} from "../Codec.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {DataResult} from "../result/DataResult.ts";
import {MapCodec} from "../MapCodec.ts";

export class FieldCodec<A> extends MapCodec<A> {
    private readonly key: string;
    private readonly codec: Codec<A>;

    public constructor(key: string, codec: Codec<A>) {
        super();
        this.key = key;
        this.codec = codec;
    }

    public override encode(value: A, prefix: NbtCompound): NbtCompound {
        prefix.set(this.key, this.codec.encode(value));
        return prefix;
    }

    public override decode(input: NbtCompound): DataResult<A> {
        const element = input.get(this.key);
        if (element === null) {
            return DataResult.error(`Missing required field "${this.key}"`);
        }
        return this.codec.decode(element);
    }
}
