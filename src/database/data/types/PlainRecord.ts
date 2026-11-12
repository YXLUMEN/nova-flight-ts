import {DataRecord} from "./DataRecord.ts";

export class PlainRecord<T> extends DataRecord<T> {
    private readonly data: T;

    public constructor(data: T) {
        super('');
        this.data = data;
    }

    protected doLoad(): Promise<T> {
        return Promise.resolve(this.data);
    }
}