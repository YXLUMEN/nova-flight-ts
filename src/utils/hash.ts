import type {Comparable} from "../type/Comparable.ts";

export function hashable(object: unknown): object is Comparable {
    const candidate = object as { hashCode?: unknown } | null | undefined;
    return typeof candidate?.hashCode === 'function';
}

export function hashString(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char; // hash * 31 + char
        hash |= 0;
    }
    return hash;
}

export function hashNumber(n: number): number {
    if (Number.isNaN(n)) return 0;
    if (!Number.isFinite(n)) return hashString(String(n));
    if (Number.isInteger(n) && n >= -0x80000000 && n <= 0x7fffffff) return n | 0;
    return hashFloat64(n);
}

const FLOAT_BYTES = new DataView(new ArrayBuffer(8));

export function hashFloat64(n: number): number {
    FLOAT_BYTES.setFloat64(0, n);
    const high = FLOAT_BYTES.getInt32(0);
    const low = FLOAT_BYTES.getInt32(4);
    return (Math.imul(high, 0x9e3779b1) ^ low) | 0;
}

export function hashBigInt(value: bigint): number {
    let hash = 0;
    let rest = value < 0n ? -value : value;
    do {
        hash = combine(hash, Number(rest & 0xffffffffn));
        rest >>= 32n;
    } while (rest !== 0n);
    return combine(hash, value < 0n ? 1 : 0);
}

export function hashSymbol(value: symbol): number {
    const key = Symbol.keyFor(value);
    // 局部 symbol 没有稳定标识, 退化到描述字符串.
    return key === undefined
        ? hashString(`local:${value.description ?? ''}`)
        : hashString(`global:${key}`);
}

function hashBytes(bytes: Uint8Array): number {
    let hash = bytes.length;
    for (let i = 0; i < bytes.length; i++) {
        hash = combine(hash, bytes[i] ?? 0);
    }
    return hash;
}

export function hashCode(object: Comparable[]): number {
    if (object.length === 0) return 0;

    let hash = 0;
    for (const value of object) {
        hash = 31 * hash + (value == null ? 0 : value.hashCode());
        hash |= 0;
    }
    return hash;
}

/**
 * Calculate the hash of any value
 *
 * - `null`, `undefined`, various primitive types, and `Symbol` are not confused with each other (labeled by type)
 * - The traversal order of regular objects, `Map`, and `Set` does not affect the results; arrays and TypedArray are considered ordered
 * - `Date` is sorted by timestamp, `RegExp` by source + flags, and `ArrayBuffer`/TypedArray by raw bytes
 * - Objects that implement `hashCode()` (`Comparable`) directly use their `hashCode()` (the result is consistent with `hashCode()`)
 * Circular references will not cause a stack overflow, as the references in the loop degenerate into a fixed sentinel value
 *
 * > Note: This is not a cryptographic hash; local `Symbol` (not `Symbol.for`) can only be distinguished by its description,
 * > Describing the same two symbols will result in the same hash
 */
export function hashObject(object: unknown): number {
    return hashValue(object, new WeakSet<object>());
}

function hashValue(value: unknown, path: WeakSet<object>): number {
    switch (typeof value) {
        case 'object':
            break;
        case 'string':
            return tag(TAG.string, hashString(value));
        case 'number':
            return tag(TAG.number, hashNumber(value));
        case 'boolean':
            return tag(TAG.boolean, value ? 1 : 0);
        case 'bigint':
            return tag(TAG.bigint, hashBigInt(value));
        case 'symbol':
            return tag(TAG.symbol, hashSymbol(value));
        case 'undefined':
            return tag(TAG.undefined, 0);
        case 'function':
            return tag(TAG.function, hashString(Function.prototype.toString.call(value)));
        default:
            return tag(TAG.undefined, 0);
    }

    if (value === null) return tag(TAG.null, 0);

    const object = value as object;
    if (hashable(object)) return object.hashCode() | 0;

    // 环上引用
    if (path.has(object)) return CIRCULAR;
    path.add(object);
    try {
        return hashContainer(object, path);
    } finally {
        path.delete(object);
    }
}

function hashContainer(object: object, path: WeakSet<object>): number {
    if (object instanceof Date) {
        const time = object.getTime();
        return tag(TAG.date, Number.isNaN(time) ? 0 : hashNumber(time));
    }

    if (object instanceof RegExp) {
        return tag(TAG.regexp, combine(hashString(object.source), hashString(object.flags)));
    }

    if (Array.isArray(object)) {
        let hash = combine(TAG.array, object.length);
        for (let i = 0; i < object.length; i++) {
            hash = combine(hash, hashValue(object[i], path));
        }
        return mix32(hash);
    }

    if (object instanceof Map) {
        let sum = 0;
        let xor = 0;
        let count = 0;
        for (const [key, entry] of object) {
            // 无序组合：Map 的插入顺序不影响 hash. 
            const mixed = mix32(combine(hashValue(key, path), hashValue(entry, path)));
            sum = (sum + mixed) | 0;
            xor ^= mixed;
            count++;
        }
        return tag(TAG.map, combine(combine(count, sum), xor));
    }

    if (object instanceof Set) {
        let sum = 0;
        let xor = 0;
        let count = 0;
        for (const entry of object) {
            const mixed = mix32(hashValue(entry, path));
            sum = (sum + mixed) | 0;
            xor ^= mixed;
            count++;
        }
        return tag(TAG.set, combine(combine(count, sum), xor));
    }

    if (object instanceof ArrayBuffer) {
        return tag(TAG.bytes, hashBytes(new Uint8Array(object)));
    }

    if (ArrayBuffer.isView(object)) {
        const bytes = new Uint8Array(object.buffer, object.byteOffset, object.byteLength);
        return tag(TAG.typedArray, combine(hashString(object.constructor.name), hashBytes(bytes)));
    }

    return hashPlainObject(object, path);
}

function hashPlainObject(object: object, path: WeakSet<object>): number {
    const members = object as Record<string, unknown>;
    const keys = Object.keys(members);
    let sum = 0;
    let xor = 0;
    for (const key of keys) {
        // 键与值一起参与, 键的顺序不影响结果. 
        const mixed = mix32(combine(hashString(key), hashValue(members[key], path)));
        sum = (sum + mixed) | 0;
        xor ^= mixed;
    }
    return tag(TAG.object, combine(combine(keys.length, sum), combine(xor, hashPrototype(object))));
}

function hashPrototype(object: object): number {
    const prototype = Object.getPrototypeOf(object) as { constructor?: { name?: unknown } } | null;
    if (prototype === null || prototype === Object.prototype) return 0;
    const name = prototype.constructor?.name;
    return typeof name === 'string' && name.length > 0 ? hashString(name) : 0;
}

/** 类型标签, 避免"不同类型但数值相同"的值互相碰撞.  */
const enum TAG {
    null = 1,
    undefined = 2,
    boolean = 3,
    number = 4,
    bigint = 5,
    string = 6,
    symbol = 7,
    function = 8,
    date = 9,
    regexp = 10,
    bytes = 11,
    typedArray = 12,
    array = 13,
    map = 14,
    set = 15,
    object = 16,
}

/** 环上引用的哨兵值.  */
const CIRCULAR = mix32(0x5bd1e995);

function mix32(hash: number): number {
    let h = hash | 0;
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h | 0;
}

/** boost::hash_combine 的变体  */
function combine(hash: number, value: number): number {
    return (hash ^ (value + 0x9e3779b9 + (hash << 6) + (hash >>> 2))) | 0;
}

function tag(kind: number, hash: number): number {
    return mix32(combine(kind, hash));
}