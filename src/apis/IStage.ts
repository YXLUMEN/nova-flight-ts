import type {World} from "../World.ts";
import type {MobEntity} from "../entity/MobEntity.ts";

export type RNG = () => number;

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

export type MobFactory = (ctx: SpawnCtx) => MobEntity | MobEntity[] | null;

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
    sampler?: SamplerKind;   // 'best'（默认）| 'golden' | 'strata'
    margin?: number;         // 左右安全边距
    // best-candidate 相关
    candidates?: number;     // 候选样本数（越大越均匀，成本线性）
    history?: number;        // 记忆窗口大小（保持局部均匀）
    minGap?: number;         // 期望最小间距（软约束）
    // strata 相关
    bins?: number;           // 分层数量
}