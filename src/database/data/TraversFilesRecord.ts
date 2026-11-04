import type {FileBuffer} from "../../type/types.ts";
import {readFile} from "@tauri-apps/plugin-fs";
import {join, resolveResource} from "@tauri-apps/api/path";
import {traverse_dir} from "../../client/ipc/fs.ts";
import {DataRecord} from "./DataRecord.ts";

export class TraversFilesRecord extends DataRecord<FileBuffer[]> {
    protected async doLoad(): Promise<FileBuffer[]> {
        const root = await resolveResource(this.url);
        const paths: string[] = [];
        await traverse_dir(root, (_, entry) => {
            if (entry.isFile) paths.push(entry.name);
        });

        const buffers: FileBuffer[] = [];
        for (const path of paths) {
            const resolved = await join(root, path);
            const buffer = await readFile(resolved);
            buffers.push({
                name: path,
                buffer: buffer.buffer,
            });
        }

        return buffers;
    }

    public override transfer(): Transferable[] | null {
        const result = this.get();
        if (result) {
            this.clear();
            return result.map(v => v.buffer);
        }
        return null;
    }
}