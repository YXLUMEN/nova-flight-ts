import {config} from "../../utils/uit.ts";
import {Vec2} from "../../utils/math/Vec2.ts";

export const Directions = config({
    SOUTH: {id: 0, name: 'south', dir: new Vec2(0, 1), direction: 1, axis: 'y'},
    NORTH: {id: 1, name: 'north', dir: new Vec2(0, -1), direction: -1, axis: 'y'},
    WEST: {id: 2, name: 'west', dir: new Vec2(1, 0), direction: 1, axis: 'x'},
    EAST: {id: 3, name: 'east', dir: new Vec2(-1, 0), direction: -1, axis: 'x'},
});

export const AllDirs = Object.values(Directions);

export type Direction = typeof Directions[keyof typeof Directions];

export function getFacing(x: number, y: number) {
    let direction = Directions.NORTH;
    let facing = 0;
    for (const dir of AllDirs) {
        const g = x * dir.dir.x + y * dir.dir.y;
        if (g > facing) {
            facing = g;
            direction = dir;
        }
    }

    return direction;
}