import type {MobEntity} from "../entity/mob/MobEntity.ts";
import type {MobFactory, SamplerKind, TopSpawnOpts} from "../apis/IStage.ts";
import {World} from "../world/World.ts";
import {randInt} from "../utils/math/math.ts";
import type {EntityType} from "../entity/EntityType.ts";
import {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import type {SpawnContext} from "./SpawnContext.ts";
import type {BiConsumer} from "../apis/types.ts";

// 顶部随机生成
export function spawnTopRandomCtor<T extends MobEntity>(
    type: EntityType<T>,
    args: readonly unknown[] = [],
    init?: BiConsumer<T, SpawnContext>
): MobFactory {
    return (ctx) => {
        const x = randInt(24, World.WORLD_W - 24);
        const mob = type.create(ctx.world, ...args);
        mob.setPosition(x, -30);
        init?.(mob, ctx);
        return mob;
    };
}

export interface SpawnConfig<T extends MobEntity> {
    type: EntityType<T>,
    args: readonly unknown[],
    init?: BiConsumer<T, SpawnContext>,
    opts?: TopSpawnOpts
}

export function spawnTopRandomCtorS<T extends MobEntity>(
    type: EntityType<T>,
    args: readonly unknown[] = [],
    init?: BiConsumer<T, SpawnContext>,
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
                    const x0 = randInt(minX, maxX);
                    recent.push(x0);
                    return x0;
                }
                let bestX = minX, bestD = -Infinity;
                for (let c = 0; c < kCandidates; c++) {
                    const x = randInt(minX, maxX);
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
        const maxX = World.WORLD_W - margin;
        const x = sampleX(minX, maxX);
        const mob = type.create(ctx.world, ...args);
        mob.setPosition(x, -30);
        init?.(mob as T, ctx);
        return mob;
    };
}

export function spawnLineCtor<T extends MobEntity>(
    type: EntityType<T>,
    count: number,
    args: any[] = [],
    init?: (mob: T, i: number, ctx: SpawnContext) => void,
    opts: { gap?: number; startY?: number } = {}
): MobFactory {
    const {gap = 48, startY = -30} = opts;
    return (ctx) => {
        const startX = randInt(24, World.WORLD_W - 24 - gap * (count - 1));
        const arr: MobEntity[] = [];
        for (let i = 0; i < count; i++) {
            const mob = type.create(ctx.world, ...args);
            mob.setPosition(startX + i * gap, startY);
            init?.(mob, i, ctx);
            arr.push(mob);
        }
        return arr;
    };
}

export function spawnFormation(configs: SpawnConfig<MobEntity>[]): MobFactory {
    return (ctx) => {
        const arr: MobEntity[] = [];
        const x = randInt(24, World.WORLD_W - 24);
        for (let i = 0; i < configs.length; i += 1) {
            const config = configs[i];
            const mob = config.type.create(ctx.world, ...config.args) as MobEntity;
            mob.setPosition(x, i + 16 + mob.getHeight());
            config.init?.(mob, ctx);
            arr.push(mob);
        }
        return arr;
    }
}

export function spawnAvoidPlayerCtor<T extends MobEntity>(
    type: EntityType<T>,
    args: readonly unknown[] = [],
    init?: BiConsumer<T, SpawnContext>,
    opts: { margin?: number; safeRadius?: number } = {}
): MobFactory {
    const margin = opts.margin ?? 24;
    const safeRadius = opts.safeRadius ? opts.safeRadius * opts.safeRadius : 16384;

    return (ctx) => {
        const minX = margin;
        const maxX = World.WORLD_W - margin;
        const minY = margin;
        const maxY = World.WORLD_H - margin;

        const players = ctx.world.getPlayers();

        let x: number, y: number;
        let tries = 0;
        do {
            x = randInt(minX, maxX);
            y = randInt(minY, maxY);
            tries++;
            if (tries > 20) break;

            let tooClose = false;
            for (const p of players) {
                const pos = p.getPositionRef;
                const dx = x - pos.x;
                const dy = y - pos.y;
                if (dx * dx + dy * dy < safeRadius) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) break;
        } while (true);

        const mob = type.create(ctx.world, ...args);
        mob.setPosition(x, y);
        init?.(mob as T, ctx);
        const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, ctx.world, mob);
        mark.setPosition(x, y);
        return mark;
    };
}
