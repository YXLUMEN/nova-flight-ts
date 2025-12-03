import type {ServerWorld} from "../server/ServerWorld.ts";
import type {RNG} from "../apis/IStage.ts";

export interface SpawnContext {
    readonly world: ServerWorld;
    // 全局舞台时间
    readonly time: number;
    // 当前阶段已用时间
    readonly phaseTime: number;
    readonly phaseIndex: number;
    readonly score: number;
    readonly rng: RNG;
    readonly difficulty: number;
}