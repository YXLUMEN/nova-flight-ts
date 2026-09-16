import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";
import {Main2WorkerType, Worker2MainType} from "./WorkerMsgType.ts";

export class WorkerFS {
    private static autoInt = new AtomicInteger();

    public static readFile(path: string, timeout: number = 1000): Promise<ArrayBuffer | null> {
        const {promise, resolve, reject} = Promise.withResolvers<ArrayBuffer>();
        const ctrl = new AbortController();
        const id = this.autoInt.get();

        const timeoutId = setTimeout(() => {
            reject(`Timeout while receive ${path}`);
            ctrl.abort();
        }, timeout);

        self.addEventListener('message', event => {
            if (event.data.m2w !== Main2WorkerType.READ_FILE || event.data.id !== id) return;

            clearTimeout(timeoutId);
            resolve(event.data.buffer);
            ctrl.abort();
        }, {signal: ctrl.signal});

        self.postMessage({
            w2m: Worker2MainType.READ_FILE,
            id,
            path,
        });

        return promise;
    }

    public static writeFile(path: string, buffer: ArrayBuffer) {
        self.postMessage({
            w2m: Worker2MainType.WRITE_FILE,
            path,
            buffer
        }, {transfer: [buffer]});
    }

    public static fetch(url: string, timeout: number = 1000) {
        const {promise, resolve, reject} = Promise.withResolvers<ArrayBuffer | null>();
        const ctrl = new AbortController();
        const id = this.autoInt.get();

        const timeoutId = setTimeout(() => {
            reject(`Timeout while fetch ${url}`);
            ctrl.abort();
        }, timeout);

        self.addEventListener('message', event => {
            if (event.data.m2w !== Main2WorkerType.FETCH || event.data.id !== id) return;

            clearTimeout(timeoutId);
            resolve(event.data.buffer);
            ctrl.abort();
        }, {signal: ctrl.signal});

        self.postMessage({
            w2m: Worker2MainType.FETCH,
            id,
            url,
        });

        return promise;
    }
}
