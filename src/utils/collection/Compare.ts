export class Compare {
    public static arraysEqual<T>(a1: T[], a2: T[]): boolean {
        if (a1 === a2) return true;
        if (a1.length !== a2.length) return false;
        for (let i = 0; i < a1.length; i++) {
            if (a1[i] !== a2[i]) return false;
        }
        return true;
    }

    public static setsEqual<T>(s1: Set<T>, s2: Set<T>): boolean {
        if (s1 === s2) return true;
        if (s1.size !== s2.size) return false;
        for (const v of s1) {
            if (!s2.has(v)) return false;
        }
        return true;
    }

    public static mapsEqual<K, V>(m1: Map<K, V>, m2: Map<K, V>): boolean {
        if (m1 === m2) return true;
        if (m1.size !== m2.size) return false;
        for (const [k, v1] of m1) {
            if (!m2.has(k)) return false;
            if (m2.get(k) !== v1) return false;
        }
        return true;
    }

    public static objectsEqual<T extends Record<string, any>>(o1: T, o2: T): boolean {
        if (o1 === o2) return true;
        const keys1 = Reflect.ownKeys(o1);
        const keys2 = Reflect.ownKeys(o2);
        if (keys1.length !== keys2.length) return false;
        for (const key of keys1) {
            if (!Object.prototype.hasOwnProperty.call(o2, key)) return false;
            if (o1[key as keyof T] !== o2[key as keyof T]) return false;
        }
        return true;
    }
}
