import {RecordManager} from "../../database/data/RecordManager.ts";
import type {DataRequest} from "../../database/data/DataFormat.ts";
import type {DataRecord} from "../../database/data/DataRecord.ts";
import {error} from "@tauri-apps/plugin-log";

export class ClientRecordManager extends RecordManager implements EventListenerObject {
    private worker: Worker | null = null;

    public setWorker(worker: Worker | null): void {
        this.worker?.removeEventListener('message', this);
        this.worker = worker;
        worker?.addEventListener('message', this);
    }

    public override dispose() {
        super.dispose();
        this.setWorker(null);
    }

    public handleEvent(event: MessageEvent): void {
        const data = event.data as DataRequest;
        if (data.type !== 'data_ipc') return;

        const worker = this.worker;
        if (!worker) return;

        const record = this.get(data.id);
        if (record) void this.response(worker, data.id, record);
    }

    private async response(worker: Worker, id: string, record: DataRecord<any>): Promise<void> {
        try {
            const result = await record.loadIfNeed();
            const transfer = record.transfer();
            if (transfer) {
                worker.postMessage({type: 'data_ipc', id, result}, {transfer});
                return;
            }

            worker.postMessage({type: 'data_ipc', id, result});
        } catch (e) {
            const err = String(e);
            worker.postMessage({type: 'data_ipc', id, err});
            await error(err);
        }
    }
}