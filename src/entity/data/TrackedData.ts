import type {Comparable} from "../../utils/collection/HashMap.ts";
import type {TrackedDataHandler} from "./TrackedDataHandler.ts";

export class TrackedData<T> implements Comparable {
    public id: number;
    public dataType: TrackedDataHandler<T>;

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

    public hashCode(): string {
        return `TrackedData:${this.dataType}:${this.id}}`;
    }
}