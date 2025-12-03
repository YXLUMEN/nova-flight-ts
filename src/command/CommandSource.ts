import type {World} from "../world/World.ts";
import {RelativePosition} from "../utils/math/RelativePosition.ts";

export abstract class CommandSource {
    public abstract getWorld(): World | null;

    public abstract hasPermissionLevel(level: number): boolean;

    public getPositionSuggestions(): RelativePosition[] {
        return [RelativePosition.ZERO_WORLD];
    }
}