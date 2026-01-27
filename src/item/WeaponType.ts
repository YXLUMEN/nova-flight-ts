import {config} from "../utils/uit.ts";

export const WeaponType = config({
    KINETIC: 1 << 0,
    ENERGY: 1 << 1,
    EXPLOSIVE: 1 << 2,
    ARC: 1 << 3,
});