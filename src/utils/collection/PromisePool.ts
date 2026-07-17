export class PromisePool {
    private readonly activeTasks = new Set();

    private readonly maxTasks: number = 8;
    private readonly abortCtrl: AbortController = new AbortController();

    private defaultTimeout: number = 0;

    public constructor(maxTasks: number = 8) {
        if (!Number.isInteger(maxTasks) || maxTasks < 1) {
            throw new Error('maxConcurrentTasks must be a positive integer');
        }
        this.maxTasks = maxTasks;
    }

    /**
     * 提交一个任务到池中执行
     * @returns {Promise} 包装后的任务Promise
     * @throws {Error} 如果池已被abort
     */
    public async submit<T, U extends unknown[]>(
        callback: (...args: U) => T | PromiseLike<T>,
        ...args: U
    ): Promise<Awaited<T>> {
        if (this.abortCtrl.signal.aborted) {
            throw new Error("Pool aborted");
        }

        while (this.activeTasks.size >= this.maxTasks) {
            await Promise.race(this.activeTasks);
            if (this.abortCtrl.signal.aborted) {
                throw new Error("Pool aborted");
            }
        }

        return this.executeTask(callback, ...args);
    }

    private executeTask<T, U extends unknown[]>(
        callback: (...args: U) => T | PromiseLike<T>,
        ...args: U
    ): Promise<Awaited<T>> {
        const rawPromise = Promise.try(callback, ...args);
        const wrappedPromise = this.withTimeoutAndAbort(rawPromise)
            .finally(() => this.activeTasks.delete(wrappedPromise));
        this.activeTasks.add(wrappedPromise);
        return wrappedPromise;
    }

    /**
     * 包装给定的 Promise，使之支持全局 abort 与默认 timeout(通过 race 的方式)
     */
    private async withTimeoutAndAbort<T>(task: Promise<T>): Promise<T> {
        const signal = this.abortCtrl.signal;
        if (signal.aborted) {
            throw new Error('Task aborted');
        }

        let timeout: number | undefined = undefined;
        const ctrl = new AbortController();
        const {promise: fail, reject} = Promise.withResolvers<never>();

        const endTask = (reason?: string) => {
            clearTimeout(timeout);
            ctrl.abort();
            if (reason) reject(new Error(reason));
        };

        signal.addEventListener(
            'abort',
            () => endTask('Task aborted'),
            {once: true, signal: ctrl.signal}
        );

        if (this.defaultTimeout > 0) timeout = setTimeout(
            () => endTask('Timeout reached'),
            this.defaultTimeout
        );

        try {
            return await Promise.race([task, fail]);
        } finally {
            endTask();
        }
    }

    /**
     * 设置默认任务超时（单位：毫秒）
     * @param {number} ms  超时时间，非负整数;0表示取消超时限制
     * @throws {Error} 如果ms参数无效
     */
    public timeout(ms: number): void {
        if (!Number.isInteger(ms) || ms < 0) {
            throw new Error("Timeout must be a non-negative integer");
        }
        this.defaultTimeout = ms;
    }

    /**
     * 全局中断池中任务.后续提交将立即报错,且所有包装中的任务会因abort而reject.
     * 注意: 对于已启动的异步操作,若内部不支持abort则不能真正取消其执行.
     */
    public abort() {
        if (this.abortCtrl.signal.aborted) return;
        this.abortCtrl.abort();
    }

    /**
     * 获取当前活跃的任务数
     * @returns {number}
     */
    public get activeTaskCount(): number {
        return this.activeTasks.size;
    }

    /**
     * 获取并发上限
     * @returns {number}
     */
    public getMaxTasks(): number {
        return this.maxTasks;
    }

    public signal() {
        return this.abortCtrl.signal;
    }
}
