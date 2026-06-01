import type {Consumer, Predicate} from "../../type/types.ts";
import type {SpawnContext} from "./SpawnContext.ts";
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

export function createPhase(obj: PhaseConfig): PhaseConfig {
    return {
        name: obj.name,
        rules: obj.rules,
        ticks: obj.ticks ?? undefined,
        until: obj.until ?? undefined,
        onEnter: obj.onEnter ?? undefined,
        onExit: obj.onExit ?? undefined,
    };
}