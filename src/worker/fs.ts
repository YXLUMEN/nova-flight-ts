import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";
import {
    Main2WorkerType,
    type RequireFetch,
    type RequireRead,
    type ResponseRead,
    Worker2MainType
} from "./WorkerMsgType.ts";

export class WorkerFS {
    private static autoInt = new AtomicInteger();

    public static readFile(path: string, timeout: number = 1000): Promise<ArrayBuffer | null> {
        const {promise, resolve, reject} = Promise.withResolvers<ArrayBuffer | null>();
        const ctrl = new AbortController();
        const id = this.autoInt.get();

        const timeoutId = setTimeout(() => {
            reject(`Timeout while receive ${path}`);
            ctrl.abort();
        }, timeout);

        self.addEventListener('message', event => {
            const data = event.data as ResponseRead;
            if (data.m2w !== Main2WorkerType.READ_FILE || data.id !== id) return;

            clearTimeout(timeoutId);
            resolve(data.buffer);
            ctrl.abort();
        }, {signal: ctrl.signal});

        self.postMessage({
            w2m: Worker2MainType.READ_FILE,
            id,
            path,
        } satisfies RequireRead);

        return promise;
    }

    public static writeFile(path: string, buffer: ArrayBuffer): void {
        self.postMessage({
            w2m: Worker2MainType.WRITE_FILE,
            path,
            buffer
        }, {transfer: [buffer]});
    }

    public static fetch(url: string, timeout: number = 1000): Promise<ArrayBuffer | null> {
        const {promise, resolve, reject} = Promise.withResolvers<ArrayBuffer | null>();
        const ctrl = new AbortController();
        const id = this.autoInt.get();

        const timeoutId = setTimeout(() => {
            reject(`Timeout while fetch ${url}`);
            ctrl.abort();
        }, timeout);

        self.addEventListener('message', event => {
            const data = event.data as ResponseRead;
            if (data.m2w !== Main2WorkerType.FETCH || data.id !== id) return;

            clearTimeout(timeoutId);
            resolve(data.buffer);
            ctrl.abort();
        }, {signal: ctrl.signal});

        self.postMessage({
            w2m: Worker2MainType.FETCH,
            id,
            url,
        } satisfies RequireFetch);

        return promise;
    }
}
