import type {World} from "../world/World.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";

export type RNG = () => number;

export type MobFactory = (ctx: SpawnCtx) => MobEntity | MobEntity[] | null;

export interface SpawnCtx {
    world: World;
    // 全局舞台时间
    time: number;
    // 当前阶段已用时间
    phaseTime: number;
    phaseIndex: number;
    score: number;
    rng: RNG;
    difficulty: number;
}

export interface SpawnRuleConfig {
    label?: string;
    // 二选一: 速率 或 固定周期.
    // 每秒生成数
    rate?: number | ((ctx: SpawnCtx) => number);
    // 固定秒间隔
    every?: number | ((ctx: SpawnCtx) => number);
    // 0..1，时间抖动比例
    jitter?: number;
    // 同屏上限
    cap?: number;
    enabled?: (ctx: SpawnCtx) => boolean;
    factory: MobFactory;
}

export interface PhaseConfig {
    name: string;
    // 秒
    duration?: number;
    // 自定义结束条件
    until?: (ctx: SpawnCtx) => boolean;
    onEnter?: (ctx: SpawnCtx) => void;
    onExit?: (ctx: SpawnCtx) => void;
    // 生成规则
    rules: SpawnRuleConfig[];
}

export type SamplerKind = 'best' | 'golden' | 'strata';

export interface TopSpawnOpts {
    // 'best'（默认）| 'golden' | 'strata'
    sampler?: SamplerKind;
    // 左右安全边距
    margin?: number;
    // 候选样本数（越大越均匀，成本线性）
    candidates?: number;
    // 记忆窗口大小（保持局部均匀）
    history?: number;
    // 期望最小间距（软约束）
    minGap?: number;
    // 分层数量
    bins?: number;
}