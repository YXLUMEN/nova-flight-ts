import type {Codec} from "../Codec.ts";
import type {BoundField} from "./BoundField.ts";
import type {NbtElement} from "../../nbt/element/NbtElement.ts";
import {CodecImpl} from "./CodecImpl.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {DataResult, ErrorResult} from "../DataResult.ts";

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
            (value: C): DataResult<NbtElement> => {
                const compound = new NbtCompound();
                let fail: ErrorResult<any>[] | null = null;

                for (const field of fields) {
                    const result = field.encode(value, compound);
                    if (result.isOk()) continue;
                    fail ??= [];
                    fail.push(result as unknown as ErrorResult<any>);
                }

                return fail === null ?
                    DataResult.ok(compound) :
                    DataResult.err(() => `Group encode fail:\n ${GroupBuilder.combine(fail)}`, compound);
            },
            (input: NbtElement): DataResult<C> => {
                if (!(input instanceof NbtCompound)) {
                    return DataResult.err(`Expected NbtCompound, got "${input.type()}"`);
                }

                const values: unknown[] = [];
                for (let i = 0; i < fields.length; i++) {
                    const fieldResult = fields[i].decode(input);
                    const value = fieldResult.resultOrPartial();
                    if (value.isEmpty()) {
                        return DataResult.err(() => fieldResult.error().get().message());
                    }
                    values.push(value.get());
                }
                return DataResult.ok(to(...values as unknown as V));
            },
            name ?? `Codec [group] (${fields.length} fields)`
        );
    }

    private static combine(errors: ErrorResult<any>[]) {
        return errors.map(v => v.message()).join('\n');
    }
}
