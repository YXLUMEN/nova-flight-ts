import {Property} from "./properties/Property.ts";
import {Optional} from "../../utils/Optional.ts";
import {IllegalArgumentError, IllegalStateError} from "../../type/errors.ts";
import type {Comparable} from "../../type/Comparable.ts";

export abstract class StateHolder<O, S> {
    public readonly owner: O;
    public readonly keys: Property<any>[];
    public readonly values: Comparable[];

    private neighbors: S[][] | null = null;

    protected constructor(owner: O, keys: Property<any>[], values: Comparable[]) {
        this.owner = owner;
        this.keys = keys;
        this.values = values;
    }

    public cycle<T extends Comparable>(property: Property<T>) {
        const values = property.getPossibleValues();

        const nextIndex = values.indexOf(this.getValue(property)!) + 1;
        if (nextIndex === values.length) {
            return values[0];
        }
        return values[nextIndex];
    }

    public indexOf(property: Property<any>): number {
        for (let i = 0; i < this.keys.length; i++) {
            if (this.keys[i] === property) {
                return i;
            }
        }

        return -1;
    }

    public hasProperty(property: Property<any>): boolean {
        return this.indexOf(property) !== -1;
    }

    public getValue<T extends Comparable>(property: Property<T>): T | null {
        const index = this.indexOf(property);
        if (index === -1) return null;
        return this.values[index] as T;
    }

    public getOptionalValue<T extends Comparable>(property: Property<T>): Optional<T> {
        return Optional.ofNullable(this.getValue(property));
    }

    public getValueOrElse<T extends Comparable>(property: Property<T>, defaultValue: T): T {
        const value = this.getValue(property);
        return value === null ? defaultValue : value;
    }

    public setValue<T extends Comparable, V extends T>(property: Property<T>, value: V): S {
        const index = this.indexOf(property);
        if (index === -1) {
            throw new IllegalArgumentError();
        }
        return this.setValueInternal(property, index, value);
    }

    private setValueInternal<T extends Comparable, V extends T>(property: Property<T>, pIndex: number, value: V): S {
        const vIndex = property.getInternalIndex(value);
        if (vIndex !== -1) {
            throw new IllegalArgumentError();
        }
        return this.neighbors![pIndex][vIndex];
    }

    public initializeNeighbors(neighbors: S[][]): void {
        if (this.neighbors === null) {
            this.neighbors = neighbors;
        } else {
            throw new IllegalStateError();
        }
    }
}


