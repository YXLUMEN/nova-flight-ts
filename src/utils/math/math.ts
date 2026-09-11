import type {Entity} from "../../entity/Entity.ts";
import type {Predicate} from "../../type/types.ts";
import type {Vec2} from "./Vec2.ts";

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shortUUID(len: number): string {
    return Math.random().toString(len).slice(2, 10);
}

export function squareDistVec2(a: Vec2, b: Vec2) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function squareDist(aX: number, aY: number, bX: number, bY: number) {
    const dx = aX - bX;
    const dy = aY - bY;
    return dx * dx + dy * dy;
}

export function wrapRadians(angle: number) {
    angle = angle % (PI2);
    if (angle > Math.PI) angle -= PI2;
    if (angle < -Math.PI) angle += PI2;
    return angle;
}

export function wrappedDelta(a: number, b: number, size: number): number {
    let d = a - b;
    if (d > size / 2) d -= size;
    if (d < -size / 2) d += size;
    return d;
}

export function lerp(delta: number, start: number, end: number): number {
    return start + delta * (end - start);
}

export function lerpRadians(delta: number, start: number, end: number): number {
    return start + delta * wrapRadians(end - start);
}

export function easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
}

export function doubleEquals(a: number, b: number, epsilon = 1E-6): boolean {
    return Math.abs(a - b) <= epsilon;
}

export function getNearestEntity<T extends Entity>(
    x: number, y: number,
    entities: Iterable<T>,
    maxDistanceSq?: number,
    predicate?: Predicate<T>
): T | null {
    let nearest = null;
    let nearestDistSq = maxDistanceSq !== undefined
        ? maxDistanceSq
        : Infinity;

    for (const entity of entities) {
        if (entity.isRemoved() || predicate?.(entity)) continue;

        const pos = entity.positionRef;
        const dx = pos.x - x;
        const dy = pos.y - y;
        const distSq = dx * dx + dy * dy;

        if (distSq > nearestDistSq) continue;
        nearestDistSq = distSq;
        nearest = entity;
    }

    return nearest;
}

export function getNearestEntityByVec<T extends Entity>(
    center: Vec2,
    entities: Iterable<T>,
    maxDistanceSq?: number,
    predicate?: Predicate<T>
): T | null {
    return getNearestEntity(center.x, center.y, entities, maxDistanceSq, predicate);
}

export function randomFromIterator<T>(iter: Iterator<T>): T | undefined {
    let result: T | undefined = undefined;
    let count = 0;

    let next = iter.next();
    while (!next.done) {
        count++;
        if (Math.random() < 1 / count) {
            result = next.value;
        }
        next = iter.next();
    }

    return result;
}

export function frac(value: number) {
    return value - Math.floor(value);
}

export function absMax(a: number, b: number): number {
    if (a < 0.0) {
        a = -a;
    }
    if (b < 0.0) {
        b = -b;
    }
    return Math.max(a, b);
}

export function cartesian(...arrays: any[][]) {
    if (arrays.length === 0) return [[]];
    return arrays.reduce((acc, curr) =>
        acc.flatMap(a => curr.map(b => [...a, b]))
    );
}

export function assertClamp(value: number, min: number, max: number) {
    if (max < min) throw new RangeError('max must larger than min');
    if (value < min) throw new RangeError('default must larger than min');
    if (value > max) throw new RangeError('default must smaller than max');
}

export const PI2 = Math.PI * 2;
export const HALF_PI = Math.PI / 2;