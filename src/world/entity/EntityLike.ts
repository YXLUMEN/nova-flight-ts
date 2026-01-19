import type {UUID} from "../../apis/types.ts";
import type {Box} from "../../utils/math/Box.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export interface EntityLike {
    getId(): number;

    getUUID(): UUID;

    getIntPos(): MutVec2;

    getBoundingBox(): Box;

    shouldSave(): boolean;

    isPlayer(): boolean;
}