import type {MobFactory} from "../apis/IStage.ts";
import type {FunctionReturn, Predicate} from "../apis/types.ts";
import type {SpawnContext} from "./SpawnContext.ts";

export interface SpawnRuleConfig {
    readonly label?: string;
    // 二选一: 速率 或 固定周期.
    // 每秒生成数
    readonly rate?: number | FunctionReturn<SpawnContext, number>;
    // 固定秒间隔
    readonly  every?: number | FunctionReturn<SpawnContext, number>;
    // 0..1，时间抖动比例
    readonly  jitter?: number;
    // 同屏上限
    readonly  cap?: number | FunctionReturn<SpawnContext, number>;
    readonly  enabled?: Predicate<SpawnContext>;
    readonly  factory: MobFactory;
}