import type {TrackedDataHandler} from "./TrackedDataHandler.ts";
import type {Comparable} from "../../type/Comparable.ts";
import {stringHashCode} from "../../utils/hash.ts";

export class TrackedData<T> implements Comparable {
    public readonly id: number;
    public readonly dataType: TrackedDataHandler<T>;

    public constructor(id: number, dataType: TrackedDataHandler<T>) {
        this.id = id;
        this.dataType = dataType;
    }

    public equals(other: Object): boolean {
        if (this === other) {
            return true;
        }
        if (other instanceof TrackedData) {
            return this.id === other.id;
        }
        return false;
    }

    public hashCode(): number {
        return (stringHashCode(this.dataType.toString()) * 31 + this.id) | 0;
    }
}