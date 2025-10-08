import type {TrackedData} from "./TrackedData.ts";
import type {DataTrackerSerializedEntry} from "./DataTracker.ts";

export interface DataTracked {
    onTrackedDataSet(data: TrackedData<any>): void;

    onDataTrackerUpdate(entries: DataTrackerSerializedEntry<any>[]): void;
}