import {Property} from "./Property.ts";
import {IllegalArgumentError} from "../../../type/errors.ts";
import {Optional} from "../../../utils/Optional.ts";

export class EnumProperty<T> extends Property<T> {
    private readonly values: T[];
    private readonly names: Map<string, T>;

    private constructor(name: string, records: Record<string, T>) {
        super(name, 'EnumProperty');

        const entries = Object.entries(records);
        if (entries.length === 0) {
            throw new IllegalArgumentError(`Trying to make empty EnumProperty '${name}'`);
        }

        this.values = entries.map(entry => entry[1]);

        const map = new Map<string, T>();
        for (const entry of entries) {
            if (map.has(entry[0])) throw new Error(`The EnumProperty '${entry[0]}' is already defined`);
            map.set(entry[0], entry[1]);
        }

        this.names = map;
        Object.freeze(this.values);
    }

    public static create<T>(name: string, records: Record<string, T>): EnumProperty<T> {
        return new EnumProperty(name, records);
    }

    public getPossibleValues(): T[] {
        return this.values;
    }

    public getValueName(value: T): string {
        return String(value);
    }

    public getValue(name: string): Optional<T> {
        return Optional.ofNullable(this.names.get(name));
    }

    public getInternalIndex(value: T): number {
        // TODO Enum对象,O(1)
        return this.values.indexOf(value);
    }
}