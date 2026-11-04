import type {Consumer} from "../../type/types.ts";
import type {DataRequest} from "./DataFormat.ts";

export class DataReceiveChannel implements EventListenerObject {
    private readonly tasks: Map<string, Consumer<any>> = new Map();

    public request<T>(id: string, signal: AbortSignal) {
        this.tasks.get(id)?.(new Error('Task aborted by new request'));

        const {promise, resolve, reject} = Promise.withResolvers<T>();
        const settle = (result: T | Error) => {
            if (Error.isError(result)) reject(result);
            else resolve(result);
            this.tasks.delete(id);
        };

        signal.addEventListener('abort', () => {
            settle(new Error('Task aborted'));
        }, {once: true});

        this.tasks.set(id, settle);
        self.postMessage({type: 'data_ipc', id} satisfies DataRequest);
        return promise;
    }

    public cancel(id: string): void {
        this.tasks.get(id)?.(new Error('Task cancel'));
    }

    public handleEvent(event: MessageEvent) {
        const data = event.data;
        if (data.type !== 'data_ipc') return;

        const task = this.tasks.get(data.id);
        if (!task) return;

        if (data.err) task(new Error('Receive error', {cause: data.err}));
        else task(data.result);
    }
}