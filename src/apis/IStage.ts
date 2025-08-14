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
    // 同屏上限（可选）
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