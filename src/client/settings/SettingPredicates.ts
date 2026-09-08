import type {Predicate} from "../../type/types.ts";
import {assertClamp} from "../../utils/math/math.ts";

export class SettingPredicates {
    private static isBool(v: unknown) {
        return typeof v === 'boolean';
    }

    public static bool(): Predicate<boolean> {
        return this.isBool;
    }

    public static number(): Predicate<number> {
        return Number.isFinite;
    }

    public static clampNumber(min: number, max: number): Predicate<number> {
        return v => Number.isFinite(v) && v >= min && v <= max;
    }

    public static string(maxLen: number = 65535): Predicate<string> {
        assertClamp(maxLen, 0, 65535);
        return v => typeof v === 'string' && v.length >= 0 && v.length <= maxLen;
    }

    public static enum<T extends StringAble>(values: T[]): Predicate<T> {
        return v => values.includes(v);
    }
}

type StringAble = string | number | boolean;