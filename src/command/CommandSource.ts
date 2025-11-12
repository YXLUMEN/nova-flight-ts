import type {World} from "../world/World.ts";

export abstract class CommandSource {
    public abstract getWorld(): World | null;

    public abstract hasPermissionLevel(level: number): boolean;
}