import type {MutVec2} from "./MutVec2.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {IVec} from "./IVec.ts";
import type {Predicate} from "../../type/types.ts";

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function randNeg(min: number, max: number) {
    return min + (Math.random() - 0.5) * (max - min);
}

export function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shortUUID(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function getBoundingRadius(entity: Entity): number {
    return Math.max(entity.getWidth(), entity.getHeight()) / 2;
}

export function collideEntityCircle(a: Entity, b: Entity): boolean {
    const dx = a.getX() - b.getX();
    const dy = a.getY() - b.getY();

    const r = getBoundingRadius(a) + getBoundingRadius(b);
    return dx * dx + dy * dy < r * r;
}

export function collideCircle(
    ax: number, ay: number, ar: number,
    bx: number, by: number, br: number
): boolean {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy < r * r;
}

export function squareDistVec2(a: IVec, b: IVec) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function squareDist(aX: number, aY: number, bX: number, bY: number) {
    const dx = aX - bX;
    const dy = aY - bY;
    return dx * dx + dy * dy;
}

export function lineCircleHit(
    ax: number, ay: number,
    bx: number, by: number,
    cx: number, cy: number,
    r: number
): boolean {
    const abx = bx - ax, aby = by - ay;
    const acx = cx - ax, acy = cy - ay;
    const abLen2 = abx * abx + aby * aby || 1e-6;

    const t = clamp((acx * abx + acy * aby) / abLen2, 0, 1);
    const px = ax + abx * t, py = ay + aby * t;
    const dx = px - cx, dy = py - cy;
    return (dx * dx + dy * dy) <= r * r;
}

export function thickLineCircleHit(
    ax: number, ay: number,
    bx: number, by: number,
    halfWidth: number,
    cx: number, cy: number,
    r: number
): boolean {
    // 计算点 (cx,cy) 到线段 (ax,ay)-(bx,by) 的最短距离平方
    const abx = bx - ax;
    const aby = by - ay;
    const acx = cx - ax;
    const acy = cy - ay;

    const abLen2 = abx * abx + aby * aby;
    if (abLen2 === 0) {
        // 线段退化为点
        const dx = cx - ax;
        const dy = cy - ay;
        const dist2 = dx * dx + dy * dy;
        return dist2 <= (halfWidth + r) * (halfWidth + r);
    }

    const t = clamp((acx * abx + acy * aby) / abLen2, 0, 1);
    const px = ax + abx * t;
    const py = ay + aby * t;

    const dx = px - cx;
    const dy = py - cy;
    const dist2 = dx * dx + dy * dy;

    const radiusSum = halfWidth + r;
    return dist2 <= radiusSum * radiusSum;
}

// 点是否在圆内(含边界)
export function pointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= r * r;
}

export function pointInCircleVec2(a: MutVec2, b: MutVec2, r: number) {
    return pointInCircle(a.x, a.y, b.x, b.y, r);
}

// 实体(圆形碰撞体)是否与圆相交
export function circleIntersectsCircle(
    cx: number, cy: number, cr: number,
    ex: number, ey: number, er: number
): boolean {
    const dx = ex - cx;
    const dy = ey - cy;
    const rr = cr + er;
    return dx * dx + dy * dy <= rr * rr;
}

// 实体(圆形碰撞体)是否完全包含在圆内
export function circleContainsCircle(
    cx: number, cy: number, cr: number,
    ex: number, ey: number, er: number
): boolean {
    const dx = ex - cx;
    const dy = ey - cy;
    const mr = cr - er;
    if (mr < 0) return false;
    return dx * dx + dy * dy <= mr * mr;
}

// 圆与AABB是否相交
export function circleIntersectsAABB(
    cx: number, cy: number, r: number,
    minX: number, minY: number, maxX: number, maxY: number
): boolean {
    const nx = Math.max(minX, Math.min(cx, maxX));
    const ny = Math.max(minY, Math.min(cy, maxY));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= r * r;
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

/**
 * @param center 起始点
 * @param entities 可迭代集合
 * @param maxDistanceSq 最大搜索距离
 * @param filter 排除满足条件
 * */
export function getNearestEntity<T extends Entity>(
    center: IVec,
    entities: Iterable<T>,
    maxDistanceSq?: number,
    filter?: Predicate<T>): T | null {
    let nearest = null;
    let nearestDistSq = maxDistanceSq !== undefined
        ? maxDistanceSq
        : Infinity;

    for (const entity of entities) {
        if (entity.isRemoved() || filter?.(entity)) continue;

        const pos = entity.getPositionRef;
        const dx = pos.x - center.x;
        const dy = pos.y - center.y;
        const distSq = dx * dx + dy * dy;

        if (distSq <= nearestDistSq) {
            nearestDistSq = distSq;
            nearest = entity;
        }
    }

    return nearest;
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

export function pointToAABBMinDistSq(px: number, py: number, left: number, top: number, right: number, bottom: number): number {
    let dx = 0, dy = 0;
    if (px < left) dx = left - px;
    else if (px > right) dx = px - right;

    if (py < top) dy = top - py;
    else if (py > bottom) dy = py - bottom;

    return dx * dx + dy * dy;
}

export function lfloor(value: number) {
    const l = Math.floor(value);
    return value < l ? l - 1 : l;
}

export function fractionalPart(value: number) {
    return value - lfloor(value);
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

export const PI2 = Math.PI * 2;
export const HALF_PI = Math.PI / 2;