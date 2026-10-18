import type {Constructor} from "../../type/types.ts";

export class ClassToNum {
    private static readonly MISSING = -1;
    private readonly backingMap = new Map<Constructor<object>, number>();

    public get(clazz: Constructor<object>): number {
        let current: Constructor<object> | null = clazz;

        while (current && current !== Object) {
            const value = this.backingMap.get(current);
            if (value !== undefined) return value;
            current = Object.getPrototypeOf(current);
        }

        return ClassToNum.MISSING;
    }

    public getNext(clazz: Constructor<object>): number {
        return this.get(clazz) + 1;
    }

    public put(clazz: Constructor<object>): number {
        const currentValue = this.get(clazz);
        const nextValue = currentValue === ClassToNum.MISSING ? 0 : currentValue + 1;
        this.backingMap.set(clazz, nextValue);
        return nextValue;
    }
}
