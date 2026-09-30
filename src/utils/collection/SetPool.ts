export class SetPool<E> {
    private readonly minIdle: number; // 闲置容量下限. 低于则不再释放
    private readonly maxIdle: number; // 闲置容量上限

    private readonly keepSizeLimit: number; // 超过这个 size 的 Set 不复用

    /** 每多少次 acquire 重算一次 target（把调整成本摊薄） */
    private readonly adjustInterval: number;

    private readonly idle: Set<E>[] = [];

    /** 当前被取走（= 索引里活着的桶）的 Set 数量 */
    private outstanding = 0;

    /** 当前窗口内的并发峰值 */
    private peak = 0;

    /** 当前目标闲置容量 */
    private target: number;

    private countdown: number;

    private hits = 0;
    private misses = 0;
    private dropped = 0;

    public constructor(
        minIdle: number = 16,
        maxIdle: number = 4096,
        keepSizeLimit: number = 1024,
        adjustInterval: number = 256,
    ) {
        this.minIdle = minIdle;
        this.maxIdle = Math.max(minIdle, maxIdle);
        this.keepSizeLimit = keepSizeLimit;
        this.adjustInterval = Math.max(1, adjustInterval);
        this.target = minIdle;
        this.countdown = this.adjustInterval;
    }

    public acquire(): Set<E> {
        if (++this.outstanding > this.peak) this.peak = this.outstanding;
        if (--this.countdown <= 0) this.adapt();

        const reused = this.idle.pop();
        if (reused === undefined) {
            this.misses++;
            return new Set<E>();
        }
        this.hits++;
        return reused;
    }

    /**
     * 归还一个已不再被任何桶引用的 Set。
     * 契约: 调用后不得再使用该 Set（入池的会被 clear，丢弃的不保证为空）。
     */
    public release(set: Set<E>): void {
        if (this.outstanding > 0) this.outstanding--;

        if (set.size > this.keepSizeLimit || this.idle.length >= this.target) {
            this.dropped++; // 交给 GC
            return;
        }
        set.clear();
        this.idle.push(set);
    }

    public drain(): void {
        this.idle.length = 0;
    }

    private adapt(): void {
        this.countdown = this.adjustInterval;

        const want = this.peak < this.minIdle ? this.minIdle
            : this.peak > this.maxIdle ? this.maxIdle
                : this.peak;

        if (want >= this.target) {
            this.target = want; // 上升立刻跟随
        } else {
            this.target -= Math.ceil((this.target - want) / 8); // 下降 1/8 衰减
            if (this.target < this.minIdle) this.target = this.minIdle;
        }

        this.peak = this.outstanding; // 下一窗口从当前并发重新起算
    }
}
