import type {TrackedData} from "./TrackedData.ts";
import {DataTracker, type DataTrackerSerializedEntry} from "./DataTracker.ts";

export class DataEntry<T> {
    public readonly data: TrackedData<T>;
    public value: T;
    public dirty: boolean = false;
    private readonly initialValue: T;

    public constructor(data: TrackedData<T>, value: T) {
        this.data = data;
        this.value = value;
        this.initialValue = value;
    }

    public isUnchanged(): boolean {
        return this.initialValue === this.value;
    }

    public toSerialized(): DataTrackerSerializedEntry<T> {
        return DataTracker.SerializedEntry.of(this.data, this.value);
    }
}