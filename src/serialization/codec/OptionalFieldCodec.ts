import {Optional} from "../../utils/Optional.ts";
import {DataResult} from "../result/DataResult.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {Codec} from "../Codec.ts";
import {MapCodec} from "../MapCodec.ts";
import type {BoundField} from "./BoundField.ts";
import type {ReturnNullable} from "../../type/types.ts";

export class OptionalFieldCodec<A> extends MapCodec<Optional<A>> {
    private readonly key: string;
    private readonly codec: Codec<A>;

    public constructor(key: string, codec: Codec<A>) {
        super();
        this.key = key;
        this.codec = codec;
    }

    public encode(value: Optional<A>, prefix: NbtCompound): NbtCompound {
        if (value.isPresent()) prefix.set(this.key, this.codec.encode(value.get()));
        return prefix;
    }

    public decode(input: NbtCompound): DataResult<Optional<A>> {
        const element = input.get(this.key);
        if (element == null) return DataResult.success(Optional.empty());
        return this.codec.decode(element).map(v => Optional.of(v));
    }

    public forNullable<C>(getter: ReturnNullable<C, A>): BoundField<C, Optional<A>> {
        return this.for(value => Optional.ofNullable(getter(value)));
    }
}
