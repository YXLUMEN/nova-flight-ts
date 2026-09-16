import {appLocalDataDir, join, resolveResource} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, remove, rename, writeFile} from "@tauri-apps/plugin-fs";
import {shortUUID} from "../utils/math/math.ts";
import {Main2WorkerType} from "../worker/WorkerMsgType.ts";

export class ClientWorkerFS {
    public async readFile(data: any, worker: Worker) {
        const path = data.path as string;
        const res = await resolveResource(`resources/nova-flight/${path}`);

        if (!(await exists(res))) {
            worker.postMessage({
                m2w: Main2WorkerType.READ_FILE,
                id: data.id,
                buffer: null
            });
            return;
        }

        const buffer = await readFile(res);
        worker.postMessage({
            m2w: Main2WorkerType.READ_FILE,
            id: data.id,
            buffer: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public async writeFile(data: any) {
        const path = data.path as string;
        const buffer = data.buffer;
        if (!(buffer instanceof ArrayBuffer)) throw new TypeError('BufferData must be an ArrayBuffer');

        const root = await appLocalDataDir();
        const saveRoot = await join(root, 'saves');
        await mkdir(saveRoot, {recursive: true});

        const resolved = await join(saveRoot, path);
        const temp = `${resolved}.${shortUUID(8)}-temp`;

        try {
            await writeFile(temp, new Uint8Array(buffer), {create: true});
            await rename(temp, resolved);
        } catch (err) {
            await remove(temp).catch();
        }
    }

    public async fetch(data: any, worker: Worker) {
        const url = data.url as string;

        const resp = await fetch(url);
        if (!resp.ok) {
            worker.postMessage({
                m2w: Main2WorkerType.FETCH,
                id: data.id,
                buffer: null
            });
            return;
        }

        const buffer = await resp.arrayBuffer();
        worker.postMessage({
            m2w: Main2WorkerType.FETCH,
            id: data.id,
            buffer: buffer
        }, {transfer: [buffer]});
    }
}