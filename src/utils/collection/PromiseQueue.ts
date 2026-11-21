import type {Consumer} from "../../type/types.ts";

export class PromiseQueue<T> {
    private readonly consume: Consumer<T>;
    private readonly onError: Consumer<unknown>;
    private pending: Promise<T>[] = [];
    private draining = false;

    public constructor(consume: Consumer<T>, onError: Consumer<unknown>) {
        this.consume = consume;
        this.onError = onError;
    }

    public push(task: Promise<T>): void {
        this.pending.push(task);
        if (this.draining) return;

        this.draining = true;
        void this.drain();
    }

    private async drain(): Promise<void> {
        try {
            while (this.pending.length > 0) {
                const batch = this.pending;
                this.pending = [];
                for (const result of await Promise.allSettled(batch)) {
                    if (result.status === 'fulfilled') this.consume(result.value);
                    else this.onError(result.reason);
                }
            }
        } finally {
            this.draining = false;
        }
    }
}