import type {Codec} from "./Codec.ts";
import type {UUID} from "../type/types.ts";
import {parseUUID, stringifyUUID} from "../utils/uuid_util.ts";
import {Codecs} from "./Codecs.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {NbtUint8Array} from "../nbt/element/NbtUint8Array.ts";
import {DataResult} from "./DataResult.ts";

export class ExtraCodec {
    public static readonly VEC2D: Codec<Vec2> = Codecs.map(Codecs.DOUBLE_ARRAY,
        val => new Vec2(val[0], val[1]),
        val => [val.x, val.y]
    );

    public static readonly VEC2F: Codec<Vec2> = Codecs.map(Codecs.FLOAT_ARRAY,
        val => new Vec2(val[0], val[1]),
        val => [val.x, val.y]
    );

    public static readonly UUID: Codec<UUID> = Codecs.of(
        val => {
            try {
                const array = new NbtUint8Array(parseUUID(val));
                return DataResult.ok(array);
            } catch (err) {
                return DataResult.err(() => String(err));
            }
        },
        input => {
            if (!(input instanceof NbtUint8Array)) {
                return DataResult.err(`UUID expected NbtUint8Array, got ${input.type()}`);
            }
            try {
                return DataResult.ok(stringifyUUID(input.value));
            } catch (err) {
                return DataResult.err(() => String(err));
            }
        }
    );
}