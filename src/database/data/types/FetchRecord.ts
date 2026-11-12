import {DataRecord} from "./DataRecord.ts";

export class FetchRecord extends DataRecord<FetchRecordType> {
    private readonly mode: DecodeMode;

    public constructor(url: string, type?: DecodeMode) {
        super(url);
        this.mode = type ?? 'arraybuffer';
    }

    protected override async doLoad(signal: AbortSignal): Promise<FetchRecordType> {
        const resp = await fetch(this.url, {signal});
        return this.mode === 'arraybuffer' ? await resp.arrayBuffer() : await resp.json();
    }

    public override transfer(): Transferable[] | null {
        const result = this.get();
        if (result instanceof ArrayBuffer) {
            this.clear();
            return [result];
        }
        return null;
    }
}

export type DecodeMode = 'json' | 'arraybuffer';
export type FetchRecordType = {} | ArrayBuffer;