import {DataEntry} from "./DataEntry.ts";
import type {DataTracked} from "./DataTracked.ts";
import {ClassToNum} from "../../utils/collection/ClassToNum.ts";
import {TrackedData} from "./TrackedData.ts";
import type {Constructor} from "../../apis/types.ts";
import type {TrackedDataHandler} from "./TrackedDataHandler.ts";
import type {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {TrackedDataHandlerRegistry} from "./TrackedDataHandlerRegistry.ts";
import type {BinaryReader} from "../../nbt/BinaryReader.ts";

export class DataTracker {
    public static readonly CLASS_TP_ID = new ClassToNum();
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

    private readonly trackedEntity: DataTracked;
    private readonly entries: DataEntry<any>[];
    private dirty: boolean = false;

    public constructor(trackedEntity: DataTracked, entries: DataEntry<any>[]) {
        this.trackedEntity = trackedEntity;
        this.entries = entries;
    }

    public static registerData<T>(entityClass: Constructor<DataTracked>, handler: TrackedDataHandler<T>): TrackedData<T> {
        const id = this.CLASS_TP_ID.put(entityClass);
        if (id > 254) {
            throw new RangeError(`Data value id is too big with ${id}; Max is 254`);
        }
        return handler.createData(id);
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

    // public copyToFrom<T>(to: DataEntry<T>, from: DataTrackerSerializedEntry<any>) {}

    public writeUpdatedEntries(entries: DataTrackerSerializedEntry<any>[]): void {
        for (const serializedEntry of entries) {
            const entry = this.entries[serializedEntry.id];
            entry.value = serializedEntry.value;
            this.trackedEntity.onTrackedDataSet(entry.data);
        }

        this.trackedEntity.onDataTrackerUpdate(entries);
    }

    public getChangedEntries(): DataTrackerSerializedEntry<any>[] | null {
        let list: DataTrackerSerializedEntry<any>[] | null = null;

        for (const entry of this.entries) {
            if (entry.isUnchanged()) continue;
            if (list === null) list = [];

            list.push(entry.toSerialized());
        }

        return list;
    }

    public isDirty() {
        return this.dirty;
    }

    public getDirtyEntries(): DataTrackerSerializedEntry<any>[] | null {
        if (!this.dirty) return null;

        this.dirty = false;
        const list = [];
        for (const entry of this.entries) {
            if (entry.dirty) {
                entry.dirty = false;
                list.push(entry.toSerialized());
            }
        }

        return list;
    }

    public static SerializedEntry = class SerializedEntry<T> {
        public readonly id: number;
        public readonly handler: TrackedDataHandler<T>;
        public readonly value: T;

        public constructor(id: number, handler: TrackedDataHandler<T>, value: T) {
            this.id = id;
            this.handler = handler;
            this.value = value;
        }

        public static of<T>(data: TrackedData<T>, value: T): DataTrackerSerializedEntry<T> {
            const handler = data.dataType;
            return new SerializedEntry(data.id, handler, value);
        }

        public write(writer: BinaryWriter): void {
            const index = TrackedDataHandlerRegistry.getId(this.handler);
            if (index === null) {
                throw new RangeError(`Unknown serializer type ${this.handler}`);
            }
            writer.writeInt8(this.id);
            writer.writeVarUint(index);
            this.handler.codec().encode(writer, this.value);
        }

        public static read(reader: BinaryReader, id: number): SerializedEntry<any> {
            const index = reader.readVarUint();
            const handler = TrackedDataHandlerRegistry.getHandler(index);
            if (handler === null) {
                throw new RangeError(`Unknown serializer type ${id}`);
            }

            return new SerializedEntry(id, handler, handler.codec().decode(reader));
        }
    }
}

export type DataTrackerSerializedEntry<T> = InstanceType<typeof DataTracker.SerializedEntry<T>>;