import type {MobFactory} from "../../type/IStage.ts";
import type {Return, Predicate} from "../../type/types.ts";
import type {SpawnContext} from "./SpawnContext.ts";

export interface SpawnRuleConfig {
    readonly label?: string;
    // 二选一: 速率 或 固定周期.
    // 每tick生成数
    readonly rate?: number | Return<SpawnContext, number>;
    // 固定间隔
    readonly  every?: number | Return<SpawnContext, number>;
    // 0..1，时间抖动比例
    readonly  jitter?: number;
    // 同屏上限
    readonly  cap?: number | Return<SpawnContext, number>;
    readonly  enabled?: Predicate<SpawnContext>;
    readonly  factory: MobFactory;
}