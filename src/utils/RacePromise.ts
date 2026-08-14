import type {Consumer} from "../type/types.ts";

export class RacePromise {
    private readonly race: Promise<void>;
    private readonly resolve: Consumer<void>;
    private readonly ctrl: AbortController;

    public constructor() {
        const {promise, resolve} = Promise.withResolvers<void>();
        this.race = promise;
        this.resolve = resolve;
        this.ctrl = new AbortController();
    }

    public async wait(...task: Promise<any>[]): Promise<void> {
        try {
            await Promise.race([this.race, ...task]);
        } finally {
            this.abort();
        }
    }

    public abort(): void {
        this.resolve();
        this.ctrl.abort();
    }

    public signal(): AbortSignal {
        return this.ctrl.signal;
    }

    public isAbort(): boolean {
        return this.ctrl.signal.aborted;
    }
}