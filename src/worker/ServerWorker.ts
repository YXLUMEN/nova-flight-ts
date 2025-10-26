export class ServerWorker {
    private readonly worker: Worker;

    public constructor(scriptUrl: string) {
        this.worker = new Worker(new URL(scriptUrl, import.meta.url), {
            type: 'module',
            name: 'server',
        });
    }

    public postMessage(message: any, options?: StructuredSerializeOptions): void {
        this.worker?.postMessage(message, options);
    }

    public terminate(): void {
        this.worker?.terminate();
    }

    public getWorker() {
        return this.worker;
    }
}