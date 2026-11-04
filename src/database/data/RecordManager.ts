import type {DataRecord} from "./DataRecord.ts";
import type {RecordType} from "./RecordType.ts";
import {Result} from "../../utils/result/Result.ts";

export class RecordManager {
    private static readonly MISSING_RECORD_ERR = Error('No record found');
    private readonly data: Map<string, DataRecord<any>> = new Map();

    public get<T>(type: RecordType<T> | string): DataRecord<T> | undefined {
        return this.data.get(typeof type === 'string' ? type : type.toString());
    }

    public async getValue<T>(type: RecordType<T>): Promise<Result<T, Error>> {
        const record = this.get<T>(type);
        if (!record) return Result.err(RecordManager.MISSING_RECORD_ERR);

        try {
            const value = await record.loadIfNeed();
            return Result.ok(value);
        } catch (err) {
            return Result.err(Result.mapErr(err));
        }
    }

    public add<T>(type: RecordType<T>, data: DataRecord<T>): void {
        this.data.set(type.toString(), data);
    }

    public remove(type: RecordType<any>): void {
        const id = type.toString();
        this.data.get(id)?.clear();
        this.data.delete(id);
    }

    public iter() {
        return this.data.entries();
    }

    public dispose(): void {
        this.data.values().forEach(v => v.clear());
        this.data.clear();
    }
}