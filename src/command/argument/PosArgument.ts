import type {ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export interface PosArgument {
    toAbsolutePos(source: ServerCommandSource): Vec2;

    toAbsoluteYaw(source: ServerCommandSource): number;

    isXRelative(): boolean;

    isYRelative(): boolean;
}