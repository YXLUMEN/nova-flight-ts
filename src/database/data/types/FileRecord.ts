import {readFile} from "@tauri-apps/plugin-fs";
import {DataRecord} from "./DataRecord.ts";

export class FileRecord extends DataRecord<ArrayBuffer> {
    protected override async doLoad(): Promise<ArrayBuffer> {
        const buffer = await readFile(this.url);
        return buffer.buffer;
    }

    public override transfer(): Transferable[] | null {
        const result = this.get();
        if (result) {
            this.clear();
            return [result];
        }
        return null;
    }
}