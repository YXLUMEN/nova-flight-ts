import {DataRecord} from "./DataRecord.ts";

export class CustomRecord<T> extends DataRecord<T> {
    private readonly loader: CustomLoader<T>;

    public constructor(url: string, loader: CustomLoader<T>) {
        super(url);
        this.loader = loader;
    }

    protected override doLoad(signal: AbortSignal): Promise<T> {
        return this.loader(this.url, signal);
    }
}

type CustomLoader<T> = (url: string, signal: AbortSignal) => Promise<T>;