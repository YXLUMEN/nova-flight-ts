import type {Consumer, Predicate} from "../apis/types.ts";
import type {SpawnContext} from "./SpawnContext.ts";
import {createClean, deepFreeze} from "../utils/uit.ts";
import type {SpawnRuleConfig} from "./SpawnRuleConfig.ts";

export interface PhaseConfig {
    readonly name: string;
    // 生成规则
    readonly rules: SpawnRuleConfig[];
    // tick
    readonly ticks?: number;
    // 自定义结束条件
    readonly until?: Predicate<SpawnContext>;
    readonly onEnter?: Consumer<SpawnContext>;
    readonly onExit?: Consumer<SpawnContext>;
}


export class PhaseConfigBuilder {
    public static create(obj: PhaseConfig) {
        return deepFreeze(createClean(obj));
    }
}