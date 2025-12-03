import type {MobEntity} from "../entity/mob/MobEntity.ts";
import type {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import type {SpawnContext} from "../stage/SpawnContext.ts";

export type RNG = () => number;

export type MobFactory = (ctx: SpawnContext) => MobEntity | MobEntity[] | SpawnMarkerEntity | SpawnMarkerEntity[] | null;


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