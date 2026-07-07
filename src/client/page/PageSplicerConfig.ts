export interface PageSplicerConfig {
    /** 根路径前缀，默认 "pages" */
    readonly basePath: string;
    /** 并发池大小，默认 8 */
    readonly concurrency: number;
    /** 单次 fetch 超时 (ms)，默认 15000，设为 0 表示不超时 */
    readonly fetchTimeout: number;
    /** 失败重试次数，默认 2 */
    readonly maxRetries: number;
    /** defer 超时基数 (ms)，默认 500 */
    readonly deferTimeoutBase: number;
}