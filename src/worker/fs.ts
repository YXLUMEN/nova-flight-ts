import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";

const autoId = new AtomicInteger();

export function readFile(path: string, timeout: number = 1000): Promise<ArrayBuffer | null> {
    const {promise, resolve, reject} = Promise.withResolvers<ArrayBuffer>();
    const ctrl = new AbortController();
    const id = autoId.get();

    const timeoutId = setTimeout(() => {
        reject(`Timeout while receive ${path}`);
        ctrl.abort();
    }, timeout);

    self.addEventListener('message', event => {
        if (event.data.type !== 'readFile' || event.data.id !== id) return;

        clearTimeout(timeoutId);
        resolve(event.data.buffer);
        ctrl.abort();
    }, {signal: ctrl.signal});

    self.postMessage({
        type: "readFile",
        id,
        path,
    });

    return promise;
}

export function writeFile(path: string, buffer: ArrayBuffer) {
    self.postMessage({
        type: "writeFile",
        path,
        buffer
    }, {transfer: [buffer]});
}