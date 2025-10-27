export class ServerWorker {
    private readonly worker: Worker;

    public constructor(worker: Worker) {
        this.worker = worker;
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