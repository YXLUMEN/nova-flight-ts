import type {RecordType} from "../../database/data/RecordType.ts";
import {RecordManager} from "../../database/data/RecordManager.ts";
import {DataReceiveChannel} from "../../database/data/DataReceiveChannel.ts";
import {IpcRecord} from "../../database/data/IpcRecord.ts";

export class ServerRecordManager extends RecordManager implements Disposable {
    private readonly channel: DataReceiveChannel;

    public constructor() {
        super();
        this.channel = new DataReceiveChannel();
        self.addEventListener('message', this.channel);
    }

    public ipc<T>(type: RecordType<T>, timeout?: number): void {
        this.add(type, new IpcRecord(type, this.channel, timeout));
    }

    public override dispose() {
        super.dispose();
        self.removeEventListener('message', this.channel);
    }

    public [Symbol.dispose](): void {
        this.dispose();
    }
}