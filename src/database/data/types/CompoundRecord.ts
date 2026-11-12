import type {NbtCompound} from "../../../nbt/element/NbtCompound.ts";
import type {Return} from "../../../type/types.ts";
import {DataRecord} from "./DataRecord.ts";
import {NbtSerialization} from "../../../nbt/NbtSerialization.ts";

export class CompoundRecord extends DataRecord<NbtCompound> {
    private readonly mapper: Return<string, Promise<NbtCompound>>;

    public constructor(url: string, mapper: Return<string, Promise<NbtCompound>>) {
        super(url);
        this.mapper = mapper;
    }

    protected override doLoad(): Promise<NbtCompound> {
        return this.mapper(this.url);
    }

    public override transfer(): Transferable[] | null {
        const result = this.get();
        return result === null ? null : [NbtSerialization.toRootBinary(result)];
    }
}