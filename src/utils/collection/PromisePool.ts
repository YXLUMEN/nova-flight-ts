import type {Supplier} from "../../apis/types.ts";

export class PromisePool {
    private readonly activeTasks = new Set();

    private readonly maxConcurrentTasks: number = 8;
    private readonly abortController: AbortController = new AbortController();

    private defaultTimeout: number = 0;
    private aborted: boolean = false;

    public constructor(maxConcurrentTasks = 8) {
        if (!Number.isInteger(maxConcurrentTasks) || maxConcurrentTasks < 1) {
            throw new Error('maxConcurrentTasks must be a positive integer');
        }
        this.maxConcurrentTasks = maxConcurrentTasks;
    }

    /**
     * 提交一个任务到池中执行
     * @param {Function} callable  任务函数
     * @param  {...any} args 任务的其他参数
     * @returns {Promise} 包装后的任务Promise
     * @throws {TypeError} 如果callable不是函数或池已被abort
     */
    public async submit(callable: Function, ...args: any[]): Promise<any> {
        if (this.aborted) {
            throw new Error("Pool aborted");
        }
        if (typeof callable !== 'function') {
            throw new TypeError('Callable must be a function');
        }

        const task: Supplier<any> = () => callable(...args, this.abortController.signal);

        while (this.activeTasks.size >= this.maxConcurrentTasks) {
            await Promise.race(this.activeTasks);
            if (this.aborted) {
                throw new Error("Pool aborted");
            }
        }

        return this.executeTask(task);
    }

    /**
     * 内部方法，执行实际的任务并做timeout/abort包装
     * @param {Function} task - 已包装好的任务函数
     * @returns {Promise} 包装后的任务 Promise
     * @private
     */
    private executeTask<T>(task: Supplier<T>): Promise<T> {
        // Promise.resolve().then(task) 保证 task 的返回值(无论是否为 Promise)都被转化为 Promise
        const rawPromise = Promise.resolve().then(task);
        // 使用包装函数将 rawPromise 与 timeout 和 abort 机制结合
        const wrappedPromise = this.withTimeoutAndAbort(rawPromise);
        // 当任务结束时，从活跃任务集合删除
        wrappedPromise.finally(() => this.activeTasks.delete(wrappedPromise));
        this.activeTasks.add(wrappedPromise);
        return wrappedPromise;
    }

    /**
     * 包装给定的 Promise，使之支持全局 abort 与默认 timeout(通过 race 的方式)
     */
    private async withTimeoutAndAbort<T>(task: Promise<T>): Promise<T> {
        const signal = this.abortController.signal;

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
        if (!this.aborted) {
            this.aborted = true;
            this.abortController.abort();
        }
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
    public getMaxConcurrentTasks(): number {
        return this.maxConcurrentTasks;
    }
}
