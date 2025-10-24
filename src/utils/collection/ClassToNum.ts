import type {Constructor} from "../../apis/types.ts";

export class ClassToNum {
    private static readonly MISSING = -1;
    private readonly backingMap = new Map<Constructor, number>();

    public get(clazz: Constructor): number {
        let current: Constructor | null = clazz;

        while (current && current !== Object) {
            const value = this.backingMap.get(current);
            if (value !== undefined) return value;
            current = Object.getPrototypeOf(current);
        }

        return ClassToNum.MISSING;
    }

    public getNext(clazz: Constructor): number {
        return this.get(clazz) + 1;
    }

    public put(clazz: Constructor): number {
        const currentValue = this.get(clazz);
        const nextValue = currentValue === ClassToNum.MISSING ? 0 : currentValue + 1;
        this.backingMap.set(clazz, nextValue);
        return nextValue;
    }
}
