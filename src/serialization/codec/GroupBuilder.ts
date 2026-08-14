import type {Codec} from "../Codec.ts";
import {CodecImpl} from "./CodecImpl.ts";
import type {BoundField} from "./BoundField.ts";
import type {NbtElement} from "../../nbt/element/NbtElement.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {DataResult} from "../result/DataResult.ts";

/**
 * 结构体 codec 构建器：Codecs.group<C>(...) 收集 BoundField 后，
 * apply(构造函数) 按字段顺序组合成 Codec<C>。
 * decode 依次解码字段，第一个失败的字段短路并携带其错误信息。
 */
export class GroupBuilder<C, V extends readonly unknown[]> {
    private readonly fields: readonly BoundField<C, any>[]

    public constructor(fields: readonly BoundField<C, any>[]) {
        this.fields = fields;
    }

    public apply(to: (...values: V) => C, name?: string): Codec<C> {
        const fields = this.fields;
        return new CodecImpl(
            (value: C): NbtElement => {
                const compound = new NbtCompound();
                for (const field of fields) {
                    field.encode(value, compound);
                }
                return compound;
            },
            (input: NbtElement): DataResult<C> => {
                if (!(input instanceof NbtCompound)) {
                    return DataResult.error(`Expected NbtCompound, got "${input.getType()}"`);
                }

                const values: unknown[] = new Array(fields.length).fill(null);
                for (let i = 0; i < fields.length; i++) {
                    const fieldResult = fields[i].decode(input);
                    const value = fieldResult.result();
                    if (value.isEmpty()) {
                        return DataResult.error(() => fieldResult.error().get().message());
                    }
                    values[i] = value.get();
                }
                return DataResult.success(to(...values as unknown as V));
            },
            name ?? `Codec [group] (${fields.length} fields)`
        );
    }
}
