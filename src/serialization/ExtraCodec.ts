import type {Codec} from "./Codec.ts";
import type {UUID} from "../type/types.ts";
import {parseUUID, stringifyUUID} from "../utils/uuid_util.ts";
import {Codecs} from "./Codecs.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {NbtUint8Array} from "../nbt/element/NbtUint8Array.ts";
import {DataResult} from "./DataResult.ts";
import {EntityColor} from "../world/entity/EntityColor.ts";
import {NbtUint32Array} from "../nbt/element/NbtUint32Array.ts";

export class ExtraCodec {
    public static readonly VEC2D: Codec<Vec2> = Codecs.map(Codecs.DOUBLE_ARRAY,
        val => new Vec2(val[0], val[1]),
        val => new Float64Array([val.x, val.y]),
    );

    public static readonly VEC2F: Codec<Vec2> = Codecs.map(Codecs.FLOAT_ARRAY,
        val => new Vec2(val[0], val[1]),
        val => new Float32Array([val.x, val.y]),
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
                return DataResult.ok(stringifyUUID(input.elements));
            } catch (err) {
                return DataResult.err(() => String(err));
            }
        }
    );

    public static readonly ENTITY_COLOR: Codec<EntityColor> = Codecs.of(
        val => {
            const array = new Uint32Array([val.hex, val.edgeHex]);
            return DataResult.ok(new NbtUint32Array(array));
        },
        input => {
            if (!(input instanceof NbtUint32Array)) {
                return DataResult.err(`EntityColor expected NbtUint32Array, got ${input.type()}`);
            }
            const array = input.elements;
            if (array.length !== 2) {
                return DataResult.err(() => `EntityColor array length expected 2, got ${array.length}`);
            }

            try {
                const color = EntityColor.default();
                color.hex = array[0];
                color.edgeHex = array[1];
                return DataResult.ok(color);
            } catch (err) {
                return DataResult.err(() => String(err));
            }
        }
    );
}