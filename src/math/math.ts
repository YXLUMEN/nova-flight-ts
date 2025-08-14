import type {Entity} from "../entity/Entity.ts";
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

export function collideCircle(a: Entity, b: Entity) {
    return dist2(a.pos, b.pos) < (a.radius + b.radius) ** 2;
}

export function dist2(a: Vec2, b: Vec2) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
}

export const PI2 = Math.PI * 2;