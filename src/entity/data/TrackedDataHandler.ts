import {TrackedData} from "./TrackedData.ts";

export abstract class TrackedDataHandler<T> {
    public create(id: number) {
        return new TrackedData(id, this);
    }

    public abstract copy(value: T): T;
}