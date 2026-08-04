import type {World} from "../World.ts";

export interface WorldMutation {
    apply(world: World): void;
}