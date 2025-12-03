import type {PosArgument} from "./PosArgument.ts";
import {CoordinateArgument} from "./CoordinateArgument.ts";
import type {ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {IllegalArgumentError} from "../../apis/errors.ts";

export class DefaultPosArgument implements PosArgument {
    private readonly x: CoordinateArgument;
    private readonly y: CoordinateArgument;

    public constructor(x: CoordinateArgument, y: CoordinateArgument) {
        this.x = x;
        this.y = y;
    }

    public toAbsolutePos(source: ServerCommandSource): Vec2 {
        const pos = source.position;
        return new Vec2(this.x.toAbsoluteCoordinate(pos.x), this.y.toAbsoluteCoordinate(pos.y));
    }

    public toAbsoluteYaw(source: ServerCommandSource): number {
        return source.yaw;
    }

    public isXRelative(): boolean {
        return this.x.isRelative();
    }

    public isYRelative(): boolean {
        return this.y.isRelative();
    }

    public static parse(reader: StringReader): DefaultPosArgument {
        const start = reader.getCursor();
        const first = CoordinateArgument.parse(reader);
        if (reader.canRead() && reader.peek() === ' ') {
            reader.skip();
            const second = CoordinateArgument.parse(reader);
            return new DefaultPosArgument(first, second);
        }

        reader.setCursor(start);
        throw new IllegalArgumentError('Incomplete arguments');
    }
}