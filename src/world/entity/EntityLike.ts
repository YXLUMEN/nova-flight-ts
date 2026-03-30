import type {UUID} from "../../apis/types.ts";
import type {AABB} from "../../utils/math/AABB.ts";

export interface EntityLike {
    getId(): number;

    getUUID(): UUID;

    getBoundingBox(): AABB;

    shouldSave(): boolean;

    isPlayer(): boolean;
}