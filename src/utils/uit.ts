import {clamp} from "./math/math.ts";

export const DPR = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));

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
            // @ts-ignore
            const value = obj[key];
            if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
                deepFreeze(value, seen);
            }
        }
    }

    return Object.freeze(obj);
}

export function createCleanObj<T>(obj: T): T {
    return Object.assign(Object.create(null), obj);
}

// 不要在游戏循环里调用
export function sleep(time: number) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function groupBy<T>(arr: T[], keyFn: (t: T) => string) {
    const m = new Map<string, T[]>();
    for (const item of arr) {
        const k = keyFn(item);
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(item);
    }
    return m;
}

export function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
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

export function rgba(hex: string, a: number): string {
    const s = hex.replace("#", "");
    const n = s.length === 3
        ? s.split("").map(c => c + c).join("")
        : s.padEnd(6, "0").slice(0, 6);
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${clamp(a, 0, 1).toFixed(3)})`;
}