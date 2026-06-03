import {clamp} from "./math/math.ts";
import type {Identifier} from "../registry/Identifier.ts";

export const DPR = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));

export function throttleTimeOut<Z, T extends (...args: any[]) => any>(
    func: T,
    wait: number = 200
) {
    let timer: number | null = null;
    return function (this: Z, ...args: Parameters<T>) {
        if (timer) return;
        func.apply(this, args);
        timer = setTimeout((): any => timer = null, wait);
    }
}

export function throttleTimeOutScope<S, T extends (...args: any[]) => any>(
    func: T,
    wait: number = 200,
    scope: S
) {
    let timer: number | null = null;
    return function (this: S, ...args: Parameters<T>) {
        if (timer) return;
        func.apply(scope, args);
        timer = setTimeout(() => timer = null, wait);
    };
}

export function debounce<Z, T extends (...args: any[]) => any>(
    func: T,
    wait: number = 50
) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return function (this: Z, ...args: Parameters<T>) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), wait);
    }
}

export function deepFreeze<T>(obj: T, seen = new WeakSet()): Readonly<T> {
    if (obj === null || typeof obj !== 'object') return obj;
    if (seen.has(obj)) return obj;
    seen.add(obj);

    if (obj instanceof Map) {
        for (const [k, v] of obj) {
            deepFreeze(k as any, seen);
            deepFreeze(v as any, seen);
        }
    } else if (obj instanceof Set) {
        for (const v of obj) {
            deepFreeze(v as any, seen);
        }
    } else {
        for (const key of Reflect.ownKeys(obj)) {
            const value = (obj as any)[key];
            if (typeof value === 'object' && value !== null) {
                deepFreeze(value, seen);
            }
        }
    }

    return Object.freeze(obj);
}

export function cleanObj<T>(obj: T): T {
    return Object.assign(Object.create(null), obj);
}

export function config<T>(obj: T): T {
    return deepFreeze(cleanObj(obj));
}

export function status<T>(obj: T): T {
    return Object.seal(cleanObj(obj));
}

export function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

export function isAscii(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 0x7F) return false;
    }
    return true;
}

export function hexToRgb(hex: string) {
    const s = hex.replace('#', '');
    return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16)
    };
}

export function withAlpha(hex: string, a: number): string {
    const c = hexToRgb(hex);
    return `rgba(${c.r},${c.g},${c.b},${a.toFixed(3)})`;
}

export function hexToRgba(hex: string, a: number): string {
    const s = hex.replace('#', "");
    const n = s.length === 3
        ? s.split('').map(c => c + c).join("")
        : s.padEnd(6, '0').slice(0, 6);
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`;
}

export function shuffleArray<T>(array: T[]): T[] {
    for (let i = array.length; i--;) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function createTranslationKey(type: string, id: Identifier | null) {
    return id == null ?
        `${type}.unregistered` :
        `${type}.${id.getNamespace()}.${id.getPath().replace('/', '.')}`
}

/**
 * 空方法
 * */
export function empty(): void {
}