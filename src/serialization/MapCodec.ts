import type {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {DataResult} from "./result/DataResult.ts";
import type {Return} from "../type/types.ts";
import {BoundField} from "./codec/BoundField.ts";

export abstract class MapCodec<A> {
    public abstract encode(value: A, prefix: NbtCompound): NbtCompound;

    public abstract decode(input: NbtCompound): DataResult<A>;

    public for<C>(getter: Return<C, A>): BoundField<C, A> {
        return new BoundField(this, getter);
    }
}
