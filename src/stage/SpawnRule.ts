import type {SpawnCtx, SpawnRuleConfig} from "../apis/IStage.ts";

export class SpawnRule {
    private t = 0;
    private next = 0;
    private cfg: SpawnRuleConfig;

    constructor(cfg: SpawnRuleConfig) {
        this.cfg = cfg;
    }

    public reset() {
        this.t = 0;
        this.next = 0;
    }

    public update(dt: number, ctx: SpawnCtx) {
        const {cfg} = this;
        if (cfg.enabled && !cfg.enabled(ctx)) return;
        if (cfg.cap && ctx.world.mobs.length >= cfg.cap) return;

        this.t += dt;

        // 计算下一次间隔
        const period = this.resolvePeriod(ctx);
        if (this.next === 0) this.next = this.t + period;

        if (this.t >= this.next) {
            this.spawn(ctx);
            const p2 = this.resolvePeriod(ctx);
            this.next += p2;
            // 防止长时间卡顿导致的多次触发洪泛
            if (this.t - this.next > 1.0) this.next = this.t + p2;
        }
    }

    private resolvePeriod(ctx: SpawnCtx): number {
        const j = Math.max(0, Math.min(1, this.cfg.jitter ?? 0));
        if (this.cfg.every !== undefined) {
            const base = typeof this.cfg.every === 'function' ? this.cfg.every(ctx) : this.cfg.every;
            return Math.max(0.001, base * this.jitterMul(ctx.rng(), j));
        }
        const r = typeof this.cfg.rate === 'function' ? this.cfg.rate(ctx) : (this.cfg.rate ?? 0);
        const base = r > 0 ? 1 / r : 999999;
        return base * this.jitterMul(ctx.rng(), j);
    }

    private jitterMul(u: number, j: number): number {
        if (j <= 0) return 1;
        const k = (u - 0.5) * 2; // [-1,1]
        return 1 + k * j;
    }

    private spawn(ctx: SpawnCtx) {
        const out = this.cfg.factory(ctx);
        if (!out) return;
        if (Array.isArray(out)) {
            for (const m of out) ctx.world.mobs.push(m);
        } else {
            ctx.world.mobs.push(out);
        }
    }
}