import type {StringReader} from "../../brigadier/StringReader.ts";
import {IllegalArgumentError} from "../../apis/errors.ts";
import type {PosArgument} from "./PosArgument.ts";
import {type ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export class LookingPosArgument implements PosArgument {
    public static readonly CARET = '^';
    private readonly x: number;
    private readonly y: number;

    public constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    public toAbsolutePos(source: ServerCommandSource): Vec2 {
        const anchor = source.position;
        const yaw = source.yaw;

        const cos = Math.cos(yaw);
        const sin = Math.sin(yaw);

        const dx = cos * this.y + sin * this.x;
        const dy = sin * this.y + -cos * this.y;
        return new Vec2(anchor.x + dx, anchor.y + dy);
    }

    public toAbsoluteYaw(): number {
        return -1.57079;
    }

    public isXRelative(): boolean {
        return true;
    }

    public isYRelative(): boolean {
        return true;
    }

    public static parse(reader: StringReader): LookingPosArgument {
        const start = reader.getCursor();
        const first = this.readCoordinate(reader, start);

        if (reader.canRead() && reader.peek() === ' ') {
            reader.skip();
            const second = this.readCoordinate(reader, start);
            return new LookingPosArgument(second, first);
        }
        reader.setCursor(start);
        throw new IllegalArgumentError('Incomplete arguments');
    }

    private static readCoordinate(reader: StringReader, startCursor: number): number {
        if (!reader.canRead()) {
            throw new IllegalArgumentError('Missing coordinate');
        }

        if (reader.peek() !== '^') {
            reader.setCursor(startCursor);
            throw new IllegalArgumentError('Can not mix coordinate');
        }

        reader.skip();
        return reader.canRead() && reader.peek() !== ' ' ? reader.readDouble() : 0;
    }
}