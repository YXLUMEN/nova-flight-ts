import type {MutVec2} from "./MutVec2.ts";
import type {Entity} from "../../entity/Entity.ts";

export function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
}

export function rand(min: number, max: number) {
    return min + Math.random() * (max - min);
}

export function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randNormal(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

export function shortUUID(): string {
    return Math.random().toString(36).slice(2, 10);
}

export function collideEntityBox(a: Entity, b: Entity): boolean {
    const boxA = a.calculateBoundingBox();
    const boxB = b.calculateBoundingBox();

    return boxA.intersectsByBox(boxB);
}

export function collideEntityCircle(a: Entity, b: Entity) {
    const ax = a.getPositionRef.x, ay = a.getPositionRef.y;
    const bx = b.getPositionRef.x, by = b.getPositionRef.y;

    const dx = ax - bx;
    const dy = ay - by;

    const r = a.getWidth() + b.getWidth();
    return dx * dx + dy * dy < r * r;
}

export function collideCircle(ax: number, ay: number, ar: number,
                              bx: number, by: number, br: number) {
    const dx = ax - bx;
    const dy = ay - by;
    const r = ar + br;
    return dx * dx + dy * dy < r * r;
}

export function dist2(a: MutVec2, b: MutVec2) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export function lineCircleHit(
    ax: number, ay: number, bx: number, by: number, cx: number, cy: number, r: number): boolean {
    const abx = bx - ax, aby = by - ay;
    const acx = cx - ax, acy = cy - ay;
    const abLen2 = abx * abx + aby * aby || 1e-6;

    let t = (acx * abx + acy * aby) / abLen2;
    t = Math.max(0, Math.min(1, t));
    const px = ax + abx * t, py = ay + aby * t;
    const dx = px - cx, dy = py - cy;
    return (dx * dx + dy * dy) <= r * r;
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
    if (mr < 0) return false; // 实体比范围圆还大，不可能“完全包含”
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
    angle = angle % (Math.PI * 2);
    if (angle > Math.PI) angle -= Math.PI * 2;
    if (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export const PI2 = Math.PI * 2;
export const HALF_PI = Math.PI / 2;