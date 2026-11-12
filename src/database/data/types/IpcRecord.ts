import type {RecordType} from "../RecordType.ts";
import type {DataReceiveChannel} from "../DataReceiveChannel.ts";
import {DataRecord} from "./DataRecord.ts";

export class IpcRecord<T> extends DataRecord<T> {
    private readonly type: RecordType<T>;
    private readonly channel: DataReceiveChannel;

    public constructor(type: RecordType<T>, channel: DataReceiveChannel, timeout?: number) {
        super('', timeout);
        this.type = type;
        this.channel = channel;
    }

    protected override async doLoad(signal: AbortSignal): Promise<T> {
        return this.channel.request(this.type.toString(), signal);
    }
}