import {DataEntry} from "./DataEntry.ts";
import type {DataTracked} from "./DataTracked.ts";
import {ClassToNum} from "../../utils/ClassToNum.ts";
import {TrackedData} from "./TrackedData.ts";
import type {Constructor} from "../../apis/registry.ts";


export class DataTracker {
    public static readonly CLASS_TP_ID = new ClassToNum();

    private readonly trackedEntity: DataTracked;
    private readonly entries: DataEntry<any>[];
    private dirty: boolean = false;

    public constructor(trackedEntity: DataTracked, entries: DataEntry<any>[]) {
        this.trackedEntity = trackedEntity;
        this.entries = entries;
    }

    public static registerData<T>(entityClass: Constructor<DataTracked>, handler: T): TrackedData<T> {
        const id = this.CLASS_TP_ID.put(entityClass);
        if (id > 254) {
            throw new RangeError(`Data value id is too big with ${id}; Max is 254`);
        }
        return new TrackedData(id, handler);
    }

    public getEntry<T>(key: TrackedData<T>): DataEntry<T> {
        return this.entries[key.id];
    }

    public get<T>(data: TrackedData<T>): T {
        return this.getEntry<T>(data).value;
    }

    public set<T>(key: TrackedData<T>, value: T): void {
        this.forceSet(key, value, false);
    }

    public forceSet<T>(key: TrackedData<T>, value: T, force: boolean): void {
        const entry = this.getEntry(key);
        if (force || value !== entry.value) {
            entry.value = value;
            this.trackedEntity.onTrackedDataSet(key);
            entry.dirty = true;
            this.dirty = true;
        }
    }

    public isDirty() {
        return this.dirty;
    }

    public static Builder = class Builder {
        private readonly entity: DataTracked;
        private readonly entries: DataEntry<any>[];

        public constructor(entity: DataTracked) {
            this.entity = entity;
            const length = DataTracker.CLASS_TP_ID.getNext(Object(entity).constructor);
            this.entries = new Array(length);
        }

        public add<T>(data: TrackedData<T>, value: T): Builder {
            const id = data.id;
            if (id > this.entries.length) {
                throw new RangeError(`Data value id is too big with ${id}; Max is ${this.entries.length}`);
            } else if (this.entries[id] !== undefined) {
                throw new Error(`Duplicate value id: ${id}`);
            } else {
                this.entries[id] = new DataEntry(data, value);
                return this;
            }
        }

        public build(): DataTracker {
            for (let i = 0; i < this.entries.length; i++) {
                if (this.entries[i] === undefined) {
                    throw new ReferenceError(`Entity ${Object(this.entity).constructor} has not defined data value ${i}`);
                }
            }

            return new DataTracker(this.entity, this.entries);
        }
    }
}

