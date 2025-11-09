import type {SpawnCtx, SpawnRuleConfig} from "../apis/IStage.ts";
import {clamp} from "../utils/math/math.ts";

export class SpawnRule {
    private ticks = 0;
    private next = 0;
    private readonly cfg: SpawnRuleConfig;

    public constructor(cfg: SpawnRuleConfig) {
        this.cfg = cfg;
    }

    public reset() {
        this.ticks = 0;
        this.next = 0;
    }

    public tick(ctx: SpawnCtx) {
        if (ctx.difficulty === 0) return;
        const cfg = this.cfg;

        if (cfg.enabled && !cfg.enabled(ctx)) return;
        if (cfg.cap && ctx.world.getMobs().size >= cfg.cap) return;

        this.ticks++;

        // 计算下一次间隔
        if (this.next === 0) {
            this.next = this.ticks + this.resolvePeriodTicks(ctx);
        }

        while (this.ticks >= this.next) {
            this.spawn(ctx);
            this.next += this.resolvePeriodTicks(ctx);
        }
    }

    private resolvePeriodTicks(ctx: SpawnCtx): number {
        const j = clamp(this.cfg.jitter ?? 0, 0, 1);
        const jitterMul = this.jitterMul(ctx.rng(), j);

        if (this.cfg.every !== undefined) {
            const baseTicks = typeof this.cfg.every === 'function'
                ? this.cfg.every(ctx)
                : this.cfg.every;
            return Math.max(1, (baseTicks * jitterMul) | 0);
        }

        const r = typeof this.cfg.rate === 'function'
            ? this.cfg.rate(ctx)
            : (this.cfg.rate ?? 0);
        const baseTicks = r > 0 ? (1 / r) | 0 : Number.MAX_SAFE_INTEGER;
        return Math.max(1, (baseTicks * jitterMul) | 0);
    }

    private jitterMul(u: number, j: number): number {
        if (j <= 0) return 1;
        const k = (u - 0.5) * 2; // [-1,1]
        return 1 + k * j;
    }

    private spawn(ctx: SpawnCtx) {
        const out = this.cfg.factory(ctx);
        if (!out) return;

        // 再次防洪
        const cap = this.cfg.cap ?? Infinity;
        const remain = cap - ctx.world.getMobs().size;
        if (remain <= 0) return;

        if (Array.isArray(out)) {
            for (const m of out) ctx.world.spawnEntity(m);
        } else {
            ctx.world.spawnEntity(out);
        }
    }
}