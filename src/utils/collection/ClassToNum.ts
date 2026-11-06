import type {Constructor} from "../../type/types.ts";

export class ClassToNum {
    private readonly backingMap: Map<Constructor<object>, number> = new Map();

    public get(clazz: Constructor<object>): number {
        let current: Constructor<object> | null = clazz;

        while (current && current !== Object) {
            const value = this.backingMap.get(current);
            if (value !== undefined) return value;
            current = Object.getPrototypeOf(current);
        }

        return -1;
    }

    public getNext(clazz: Constructor<object>): number {
        return this.get(clazz) + 1;
    }

    public put(clazz: Constructor<object>): number {
        const currentValue = this.get(clazz);
        const nextValue = currentValue === -1 ? 0 : currentValue + 1;
        this.backingMap.set(clazz, nextValue);
        return nextValue;
    }
}
