import {documentDir, resolve, resolveResource} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, writeFile} from "@tauri-apps/plugin-fs";

export class ClientWorkerFS {
    public async readFile(data: any, worker: Worker) {
        const path = data.path as string;
        const res = await resolveResource(`resources/nova-flight/${path}`);

        if (!(await exists(res))) {
            worker.postMessage({
                type: 'readFile',
                id: data.id,
                buffer: null
            });
            return;
        }

        const buffer = await readFile(res);
        worker.postMessage({
            type: 'readFile',
            id: data.id,
            buffer: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public async writeFile(data: any) {
        const path = data.path as string;
        const buffer = data.buffer;
        if (!(buffer instanceof ArrayBuffer)) throw new TypeError('BufferData must be an ArrayBuffer');

        const documentPath = await documentDir();
        const saveRoot = await resolve(documentPath, 'saves');
        if (!await exists(saveRoot)) {
            await mkdir(saveRoot);
        }

        const resolved = await resolve(saveRoot, path);
        await writeFile(resolved, new Uint8Array(buffer), {create: true});
    }

    public async fetch(data: any, worker: Worker) {
        const url = data.url as string;

        const resp = await fetch(url);
        if (!resp.ok) {
            worker.postMessage({
                type: 'fetch',
                id: data.id,
                buffer: null
            });
            return;
        }

        const buffer = await resp.arrayBuffer();
        worker.postMessage({
            type: 'fetch',
            id: data.id,
            buffer: buffer
        }, {transfer: [buffer]});
    }
}