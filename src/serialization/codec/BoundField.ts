import type {MapCodec} from "../MapCodec.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {DataResult} from "../result/DataResult.ts";
import type {Return} from "../../type/types.ts";

export class BoundField<C, A> {
    private readonly field: MapCodec<A>;
    private readonly getter: Return<C, A>;

    public constructor(field: MapCodec<A>, getter: Return<C, A>) {
        this.field = field;
        this.getter = getter;
    }

    public encode(value: C, prefix: NbtCompound): NbtCompound {
        return this.field.encode(this.getter(value), prefix);
    }

    public decode(input: NbtCompound): DataResult<A> {
        return this.field.decode(input);
    }
}

