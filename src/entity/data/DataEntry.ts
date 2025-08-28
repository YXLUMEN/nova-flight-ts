import type {TrackedData} from "./TrackedData.ts";

export class DataEntry<T> {
    public readonly data: TrackedData<T>;
    public value: T;
    private readonly initialValue: T;
    public dirty: boolean = false;

    public constructor(data: TrackedData<T>, value: T) {
        this.data = data;
        this.value = value;
        this.initialValue = value;
    }

    public isUnchanged(): boolean {
        return this.initialValue === this.value;
    }
}