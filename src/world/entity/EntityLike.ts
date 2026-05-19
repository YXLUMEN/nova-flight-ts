import type {UUID} from "../../type/types.ts";
import type {AABB} from "../../utils/math/AABB.ts";

export interface EntityLike {
    getId(): number;

    getUUID(): UUID;

    getBoundingBox(): AABB;

    shouldSave(): boolean;

    isPlayer(): boolean;

    // 由索引控制,禁止手动管理
    searchGen: number;
}