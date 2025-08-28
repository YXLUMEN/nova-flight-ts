import type {TrackedData} from "./TrackedData.ts";
import type {DataEntry} from "./DataEntry.ts";

export interface DataTracked {
    onTrackedDataSet(data: TrackedData<any>): void;

    onDataTrackerUpdate(entries: DataEntry<any>): void;
}