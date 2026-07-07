import {Vec2} from "./Vec2.ts";
import {Axis} from "./Axis.ts";

export class Direction {
    public static readonly UP = new Direction(0, 1, 'north', Axis.X, new Vec2(0, 1), 1);
    public static readonly DOWN = new Direction(1, 0, 'south', Axis.X, new Vec2(0, -1), -1);
    public static readonly LEFT = new Direction(2, 3, 'west', Axis.Y, new Vec2(-1, 0), -1);
    public static readonly RIGHT = new Direction(3, 2, 'east', Axis.Y, new Vec2(1, 0), 1);
    public static readonly ALL_DIRS = [this.UP, this.DOWN, this.LEFT, this.RIGHT];

    public readonly id: number;
    public readonly opposite: number;
    public readonly name: string;
    public readonly axis: Axis;
    public readonly normal: Vec2;
    public readonly dir: number;

    public constructor(id: number, opposite: number, name: string, axis: Axis, normal: Vec2, dir: number) {
        this.id = id;
        this.opposite = opposite;
        this.name = name;
        this.axis = axis;
        this.normal = normal;
        this.dir = dir;
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