import type {Entity} from "../../entity/Entity.ts";
import {clamp} from "./math.ts";
import type {MutVec2} from "./MutVec2.ts";

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