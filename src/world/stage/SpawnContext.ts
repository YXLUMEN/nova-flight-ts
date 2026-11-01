import type {ServerWorld} from "../../server/ServerWorld.ts";
import type {Random} from "../../utils/math/random/Random.ts";

export interface SpawnContext {
    readonly world: ServerWorld;
    // 全局舞台时间
    readonly time: number;
    // 当前阶段已用时间
    readonly phaseTime: number;
    readonly phaseIndex: number;
    readonly score: number;
    readonly rng: Random;
    readonly difficulty: number;
}