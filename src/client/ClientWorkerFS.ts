import {appLocalDataDir, dirname, join} from "@tauri-apps/api/path";
import {exists, mkdir, readFile, remove, rename, writeFile} from "@tauri-apps/plugin-fs";
import {shortUUID} from "../utils/math/math.ts";
import {
    Main2WorkerType,
    type RequireFetch,
    type RequireRead,
    type RequireWrite,
    type ResponseRead
} from "../worker/WorkerMsgType.ts";
import {Log} from "../worker/log.ts";

export class ClientWorkerFS {
    public async readFile(data: RequireRead, worker: Worker) {
        const root = await appLocalDataDir();
        const path = await join(root, data.path);

        if (!(await exists(path))) {
            worker.postMessage({
                m2w: Main2WorkerType.READ_FILE,
                id: data.id,
                buffer: null
            } satisfies ResponseRead);
            return;
        }

        const buffer = await readFile(path);
        worker.postMessage({
            m2w: Main2WorkerType.READ_FILE,
            id: data.id,
            buffer: buffer.buffer
        } satisfies ResponseRead, {transfer: [buffer.buffer]});
    }

    public async writeFile(data: RequireWrite) {
        const buffer = data.buffer;
        if (!(buffer instanceof ArrayBuffer)) throw new TypeError('BufferData must be an ArrayBuffer');

        const root = await appLocalDataDir();
        const path = await join(root, data.path);
        const dir = await dirname(path);

        await mkdir(dir, {recursive: true});
        const temp = `${path}.${shortUUID(8)}-temp`;
        try {
            await writeFile(temp, new Uint8Array(buffer), {create: true});
            await rename(temp, path);
        } catch (err) {
            await Log.error(`Fail to write file:\n  ${err}`);
            await remove(temp)
                .catch(err => Log.error(`Error occur when remove temp file. Cause by:\n  ${err}`));
        }
    }

    public async fetch(data: RequireFetch, worker: Worker): Promise<void> {
        const url = data.url as string;

        const resp = await fetch(url);
        if (!resp.ok) {
            worker.postMessage({
                m2w: Main2WorkerType.FETCH,
                id: data.id,
                buffer: null
            } satisfies ResponseRead);
            return;
        }

        const buffer = await resp.arrayBuffer();
        worker.postMessage({
            m2w: Main2WorkerType.FETCH,
            id: data.id,
            buffer: buffer
        } satisfies ResponseRead, {transfer: [buffer]});
    }
}