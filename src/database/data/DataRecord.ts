import {clamp} from "../../utils/math/math.ts";

export abstract class DataRecord<T> {
    public readonly url: string;

    private readonly timeout: number;
    private ctrl: AbortController | null = null;
    private cache: T | null = null;

    public constructor(url: string, timeout: number = 2000) {
        this.url = url;
        // 限制上限避免 AbortSignal.timeout 长时间持有闭包
        this.timeout = clamp(timeout, 0, 30_000);
    }

    public load(): Promise<T> {
        this.cancel();
        this.ctrl = new AbortController();
        const abort = this.ctrl.signal;
        const timeout = AbortSignal.timeout(this.timeout);

        return this.doLoad(AbortSignal.any([abort, timeout]));
    }

    protected abstract doLoad(signal: AbortSignal): Promise<T> ;

    public get(): T | null {
        return this.cache;
    }

    public async loadIfNeed(): Promise<T> {
        if (this.cache) return this.cache;
        return await this.fresh();
    }

    public transfer(): Transferable[] | null {
        return null;
    }

    public async fresh(): Promise<T> {
        const task = this.load();
        const ctrl = this.ctrl;
        const cache = await task;

        if (ctrl === this.ctrl) this.cache = cache;
        return cache;
    }

    public cancel(reason?: any): void {
        this.ctrl?.abort(reason);
        this.ctrl = null;
    }

    public clear(): void {
        this.cancel();
        this.cache = null;
    }
}