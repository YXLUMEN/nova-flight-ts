import type {UUID} from "../../apis/types.ts";
import type {Box} from "../../utils/math/Box.ts";

export interface EntityLike {
    getId(): number;

    getUUID(): UUID;

    getBoundingBox(): Box;

    shouldSave(): boolean;

    isPlayer(): boolean;
}