import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import type {Codec} from "./Codec.ts";
import {config} from "../utils/uit.ts";

export class Codecs {
    public static readonly INT32: Codec<number> = config({
        encode(v: number) {
            return new NbtCompound().putInt32("value", v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getInt32("value");
        }
    });

    public static readonly UINT32: Codec<number> = config({
        encode(value: number): NbtCompound {
            return new NbtCompound().putUint("value", value);
        },
        decode(nbt: NbtCompound): number | null {
            return nbt.getUint("value");
        }
    });

    public static readonly FLOAT: Codec<number> = config({
        encode(v: number) {
            return new NbtCompound().putFloat("value", v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getFloat("value");
        }
    });

    public static readonly DOABLE: Codec<number> = config({
        encode(v: number) {
            return new NbtCompound().putDouble("value", v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getDouble("value");
        }
    });

    public static readonly STRING: Codec<string> = config({
        encode(v: string) {
            return new NbtCompound().putString("value", v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getString("value");
        }
    });

    public static readonly BOOLEAN: Codec<boolean> = config({
        encode(v: boolean) {
            return new NbtCompound().putBoolean("value", v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getBoolean("value");
        }
    });

    public static readonly NUMER_ARRAY: Codec<number[]> = config({
        encode(v: number[]) {
            return new NbtCompound().putNumberArray("value", ...v);
        },
        decode(nbt: NbtCompound) {
            return nbt.getNumberArray("value");
        }
    });

    public static readonly STRING_ARRAY: Codec<string[]> = config({
        encode(value: string[]): NbtCompound {
            return new NbtCompound().putStringArray("value", ...value);
        },
        decode(nbt: NbtCompound): string[] {
            return nbt.getStringArray("value");
        }
    });

    public static readonly VEC2: Codec<IVec> = config({
        encode(value: IVec): NbtCompound {
            const nbt = new NbtCompound();
            nbt.putNumberArray('value', value.x, value.y);
            return nbt;
        },
        decode(nbt: NbtCompound): Vec2 | null {
            const num = nbt.getNumberArray('value');
            if (!num || num.length === 0) return null;
            return new Vec2(num[0], num[1]);
        }
    });
}