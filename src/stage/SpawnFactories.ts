import type {MobEntity} from "../entity/mob/MobEntity.ts";
import type {MobFactory, SamplerKind, SpawnCtx, TopSpawnOpts} from "../apis/IStage.ts";
import {World} from "../world/World.ts";
import {rand} from "../utils/math/math.ts";
import type {EntityType} from "../entity/EntityType.ts";

// 顶部随机生成
function spawnTopRandomCtor<T extends MobEntity>(
    type: EntityType<T>,
    args: readonly unknown[] = [],
    init?: (mob: T, ctx: SpawnCtx) => void
): MobFactory {
    return (ctx) => {
        const x = rand(24, World.W - 24);
        const mob = type.create(World.instance, ...args);
        mob.setPosition(x, -30);
        init?.(mob, ctx);
        return mob;
    };
}

export interface spawnConfig<T extends MobEntity> {
    type: EntityType<T>,
    args: readonly unknown[],
    init?: (mob: T, ctx: SpawnCtx) => void,
    opts?: TopSpawnOpts
}

function spawnTopRandomCtorS<T extends MobEntity>(
    type: EntityType<T>,
    args: readonly unknown[] = [],
    init?: (mob: T, ctx: SpawnCtx) => void,
    opts: TopSpawnOpts = {}
): MobFactory {
    const sampler: SamplerKind = opts.sampler ?? 'best';
    const margin = opts.margin ?? 24;

    // best-candidate 状态
    const kCandidates = Math.max(2, opts.candidates ?? 8);
    const histMax = Math.max(1, opts.history ?? 16);
    const minGap = Math.max(0, opts.minGap ?? 64);
    const recent: number[] = [];

    // golden ratio 低差异序列状态
    let t = Math.random(); // 初始相位
    const phi = 0.6180339887498949; // (sqrt(5)-1)/2

    // stratified 分层抖动状态
    const bins = Math.max(1, opts.bins ?? 8);
    let binIndex = Math.floor(Math.random() * bins); // 随机起始分层

    function sampleX(minX: number, maxX: number): number {
        if (maxX <= minX) return minX;

        switch (sampler) {
            case 'golden': {
                t += phi;
                t -= Math.floor(t); // t = frac(t + phi)
                return minX + (maxX - minX) * t;
            }
            case 'strata': {
                const w = (maxX - minX) / bins;
                const i = binIndex;
                binIndex = (binIndex + 1) % bins;
                // 分层内加入轻微抖动
                const jitter = (Math.random() - 0.5) * 0.5; // [-0.25, 0.25) 层宽
                return minX + (i + 0.5 + jitter) * w;
            }
            default: { // 'best': Mitchell best-candidate(1D 近似蓝噪声)
                if (recent.length === 0) {
                    const x0 = rand(minX, maxX);
                    recent.push(x0);
                    return x0;
                }
                let bestX = minX, bestD = -Infinity;
                for (let c = 0; c < kCandidates; c++) {
                    const x = rand(minX, maxX);
                    // 与历史最近点的距离(软性加入 minGap)
                    let d = Infinity;
                    for (let i = 0; i < recent.length; i++) {
                        const dx = Math.abs(x - recent[i]);
                        d = Math.min(d, dx);
                        if (d === 0) break;
                    }
                    // 轻微奖励：距离 minGap 附近更优(使间距趋向 minGap)
                    const bias = -Math.abs(d - minGap) * 0.01;
                    const score = d + bias;
                    if (score > bestD) {
                        bestD = score;
                        bestX = x;
                    }
                }
                recent.push(bestX);
                if (recent.length > histMax) recent.shift();
                return bestX;
            }
        }
    }

    return (ctx) => {
        const minX = margin;
        const maxX = World.W - margin;
        const x = sampleX(minX, maxX);
        const mob = type.create(World.instance, ...args);
        mob.setPosition(x, -30);
        init?.(mob as T, ctx);
        return mob;
    };
}

function spawnLineCtor<T extends MobEntity>(
    type: EntityType<T>,
    count: number,
    args: any[] = [],
    init?: (mob: T, i: number, ctx: SpawnCtx) => void,
    opts: { gap?: number; startY?: number } = {}
): MobFactory {
    const {gap = 48, startY = -30} = opts;
    return (ctx) => {
        const startX = rand(24, World.W - 24 - gap * (count - 1));
        const arr: MobEntity[] = [];
        for (let i = 0; i < count; i++) {
            const mob = type.create(World.instance, ...args);
            mob.setPosition(startX + i * gap, startY);
            init?.(mob, i, ctx);
            arr.push(mob);
        }
        return arr;
    };
}

function spawnFormation(configs: spawnConfig<any>[]): MobFactory {
    return (ctx) => {
        const arr = [];
        let gap = 0;
        const x = rand(24, World.W - 24);
        for (const config of configs) {
            const mob = config.type.create(World.instance, ...config.args) as MobEntity;
            mob.setPosition(x, -30 + gap);
            gap += -16 - mob.getEntityDimension().height;
            config.init?.(mob, ctx);
            arr.push(mob);
        }
        return arr;
    }
}

export {
    spawnTopRandomCtor,
    spawnTopRandomCtorS,
    spawnLineCtor,
    spawnFormation,
}