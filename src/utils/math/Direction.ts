import {Vec2} from "./Vec2.ts";
import {Axis} from "./Axis.ts";
import {wrapRadians} from "./math.ts";

export class Direction {
    public static readonly UP = new Direction(0, 1, 'up', Axis.X, new Vec2(0, -1), -1);
    public static readonly DOWN = new Direction(1, 0, 'down', Axis.X, new Vec2(0, 1), 1);
    public static readonly LEFT = new Direction(2, 3, 'left', Axis.Y, new Vec2(-1, 0), -1);
    public static readonly RIGHT = new Direction(3, 2, 'right', Axis.Y, new Vec2(1, 0), 1);
    public static readonly ALL_DIRS = [this.UP, this.DOWN, this.LEFT, this.RIGHT];

    static {
        Object.freeze(this.ALL_DIRS);
    }

    public readonly id: number;
    public readonly opposite: number;
    public readonly name: string;
    public readonly axis: Axis;
    public readonly normal: Vec2;
    public readonly normalAngle: number;
    public readonly dir: number;

    public constructor(id: number, opposite: number, name: string, axis: Axis, normal: Vec2, dir: number) {
        this.id = id;
        this.opposite = opposite;
        this.name = name;
        this.axis = axis;
        this.normal = normal;
        this.normalAngle = wrapRadians(Math.atan2(normal.y, normal.x));
        this.dir = dir;
        Object.freeze(this);
    }

    public oppositeDir() {
        return Direction.ALL_DIRS[this.opposite];
    }

    public static getFacing(x: number, y: number) {
        let direction = this.DOWN;
        let facing = 0;
        for (const dir of this.ALL_DIRS) {
            const g = x * dir.normal.x + y * dir.normal.y;
            if (g > facing) {
                facing = g;
                direction = dir;
            }
        }

        return direction;
    }
}