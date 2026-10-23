import type {ParticleAttr} from "./ParticleAttr.ts";
import {ATTR_COUNT, ATTR_SHIFT, attrBit, ROW_SLOTS} from "./ParticleAttr.ts";
import type {RareColumn} from "./RareColumn.ts";

/**
 * 三条不变式:
 *   1. [0, active) 连续无空洞, 由 swapRemove 维护.
 *   2. 所有列 (核心行 / meta / 外挂列) 必须同步搬家, 否则数据错位.
 *   3. 外挂列读取前必须验 meta 位: 因为搬运是无条件复制值列的,
 *      没有该属性的槽位里可能残留脏值.
 */
export class ParticleStore {
    public readonly cap: number;
    public readonly f32: Float32Array;
    public readonly u32: Uint32Array;

    /** 活跃粒子数, 有效区间 [0, active) */
    public active: number = 0;

    /** shape | 外挂属性 presence 位 */
    public readonly meta: Uint16Array;
    /** 按 ParticleAttr 索引的外挂列 */
    private readonly cols: (RareColumn | null)[];

    /** 每个属性的持有点数, 用于维护池级 mask */
    private readonly count: Int32Array;

    private mask_: number = 0;

    public constructor(capacity: number) {
        this.cap = capacity;

        const buf = new ArrayBuffer(capacity * ROW_SLOTS * 4);
        this.f32 = new Float32Array(buf);
        this.u32 = new Uint32Array(buf);

        this.meta = new Uint16Array(capacity);
        this.cols = new Array<RareColumn | null>(ATTR_COUNT).fill(null);
        this.count = new Int32Array(ATTR_COUNT);
    }

    public get mask(): number {
        return this.mask_;
    }

    /** 分配一个槽位; 池满返回 -1 */
    public alloc(): number {
        return this.active >= this.cap ? -1 : this.active++;
    }

    /** 取外挂列 */
    public peek(attr: ParticleAttr): Float32Array | null {
        const col = this.cols[attr];
        return col === null ? null : col.data;
    }

    /** 取外挂列, 缺则惰性分配 (未启用的属性不占内存) */
    public column(attr: ParticleAttr): Float32Array {
        const col = this.cols[attr];
        if (col !== null) return col.data;

        const data = new Float32Array(this.cap);
        this.cols[attr] = {attr, bit: attrBit(attr), data};
        return data;
    }

    /** 附加一个带值的外挂属性 */
    public attach(index: number, attr: ParticleAttr, value: number): void {
        this.column(attr)[index] = value;
        this.raise(index, attr);
    }

    /** 附加一个纯标记属性 (无数据列) */
    public tag(index: number, attr: ParticleAttr): void {
        this.raise(index, attr);
    }

    /** 移除属性; 值列不清空 */
    public detach(index: number, attr: ParticleAttr): void {
        const bit = attrBit(attr);
        if ((this.meta[index] & bit) === 0) return;

        this.meta[index] &= ~bit;
        if (--this.count[attr] === 0) this.mask_ &= ~bit;
    }

    /** 读属性值; 无该属性时返回 0 (缺省值非 0 的属性应放进核心行) */
    public read(index: number, attr: ParticleAttr): number {
        const col = this.cols[attr];
        if (col === null || (this.meta[index] & col.bit) === 0) return 0;
        return col.data[index];
    }

    public countOf(attr: ParticleAttr): number {
        return this.count[attr];
    }

    /**
     * 移除槽位 index: 用末尾元素顶替, 保持 [0, active) 连续.
     *
     * 核心行用一次 copyWithin (memmove) 搬完; 外挂列只在 meta 位置位时复制,
     * 因此"没人用的属性"在死亡路径上也是零成本.
     */
    public swapRemove(index: number): void {
        const last = --this.active;

        // 1) 先给死掉的那个销账 —— 必须在 index === last 的早退之前,
        //    否则最后一个粒子被移除后池级 mask 会漂移
        this.release(this.meta[index]);

        if (index === last) return;

        // 2) 搬核心行: f32 视图覆盖同一 buffer 的 u32 槽
        this.f32.copyWithin(index * ROW_SLOTS, last * ROW_SLOTS, (last + 1) * ROW_SLOTS);

        // 3) 搬 meta 与它指向的列. 计数不变 (只是换位置), 脏值读不到
        const m = this.meta[last];
        this.meta[index] = m;

        const cols = this.cols;
        for (let a = 0; a < cols.length; a++) {
            const col = cols[a];
            if (col !== null && (m & col.bit) !== 0) col.data[index] = col.data[last];
        }
    }

    /** 清空池子. 列数据不擦除, 只重置活跃数与记账 */
    public clear(): void {
        this.active = 0;
        this.count.fill(0);
        this.mask_ = 0;
    }

    /**
     * 调试/测试用: 由 meta 重算持有点数与池级 mask, 与记账比对.
     * 返回 null 表示一致.
     */
    public verifyAccounting(): string | null {
        const recount = new Int32Array(ATTR_COUNT);

        for (let i = 0; i < this.active; i++) {
            let bits = this.meta[i] >>> ATTR_SHIFT;
            while (bits !== 0) {
                const low = bits & -bits;
                recount[31 - Math.clz32(low)]++;
                bits ^= low;
            }
        }

        let mask = 0;
        for (let a = 0; a < ATTR_COUNT; a++) {
            if (recount[a] !== this.count[a]) {
                return `attr ${a}: meta=${recount[a]}, count=${this.count[a]}`;
            }
            if (recount[a] > 0) mask |= 1 << (ATTR_SHIFT + a);
        }

        return mask === this.mask_ ? null : `mask 漂移: 期望 ${mask}, 实际 ${this.mask_}`;
    }

    /** 置位 + 记账; 已置位则空转 */
    private raise(index: number, attr: ParticleAttr): void {
        const bit = attrBit(attr);
        if ((this.meta[index] & bit) !== 0) return;

        this.meta[index] |= bit;
        if (++this.count[attr] === 1) this.mask_ |= bit;
    }

    /** 按 meta 里的置位逐个销账 */
    private release(m: number): void {
        let bits = m >>> ATTR_SHIFT;
        while (bits !== 0) {
            const low = bits & -bits;
            const attr = 31 - Math.clz32(low);
            if (--this.count[attr] === 0) this.mask_ &= ~(low << ATTR_SHIFT);
            bits ^= low;
        }
    }
}
