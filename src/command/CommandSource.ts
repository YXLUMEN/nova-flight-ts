import type {World} from "../world/World.ts";

export interface CommandSource {
    getWorld(): World | null;
}