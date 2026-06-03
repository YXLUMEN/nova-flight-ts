import type {Consumer} from "../../type/types.ts";

export class CancelToken {
    private cancelled: boolean = false;
    private timer: ReturnType<typeof setTimeout> | undefined = undefined;
    private pending: Consumer<boolean> | undefined = undefined;

    public isCancelled(): boolean {
        return this.cancelled;
    }

    public cancel(): void {
        this.cancelled = true;
        this.clearDelay();
    }

    public delay(ms: number): Promise<boolean> {
        if (this.cancelled) return Promise.resolve(false);
        this.clearDelay();

        return new Promise<boolean>(resolve => {
            this.pending = resolve;
            this.timer = setTimeout(() => {
                this.pending = undefined;
                this.timer = undefined;
                resolve(true);
            }, ms);
        });
    }

    public wait(): Promise<boolean> {
        if (this.cancelled) return Promise.resolve(false);

        this.clearDelay();
        return new Promise<boolean>(resolve => {
            this.pending = resolve;
        });
    }

    private clearDelay() {
        clearTimeout(this.timer);
        this.pending?.(false);
        this.pending = undefined;
        this.timer = undefined;
    }
}
