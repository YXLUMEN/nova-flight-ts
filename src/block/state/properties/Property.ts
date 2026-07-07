import {Optional} from "../../../utils/Optional.ts";
import type {Comparable} from "../../../type/Comparable.ts";


export abstract class Property<T> implements Comparable {
    protected readonly name: string;
    protected readonly typeName: string;
    private cacheHash: string | null = null;

    protected constructor(name: string, typeName?: string) {
        this.name = name;
        this.typeName = typeName === undefined ? this.constructor.name : typeName;
    }

    public getName(): string {
        return this.name;
    }

    public abstract getPossibleValues(): T[];

    public abstract getValueName(value: T): string;

    public abstract getValue(name: string): Optional<T>;

    public abstract getInternalIndex(value: T): number;

    public toString(): string {
        return `Property[name,${this.name};values,${this.getPossibleValues()}]`;
    }

    public equals(other: unknown): boolean {
        if (this === other) return true;
        if (other instanceof Property) {
            return this.name === other.name && this.typeName === other.typeName;
        }

        return false;
    }

    public hashCode(): string {
        if (this.cacheHash === null) {
            this.cacheHash = this.generateHashCode();
        }

        return this.cacheHash;
    }

    public generateHashCode(): string {
        return `Property[${this.typeName}:${this.name}]`;
    }
}