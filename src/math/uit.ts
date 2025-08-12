import type {Vec2} from "./Vec2.ts";
import type {Entity} from "../entity/Entity.ts";

export const DPR = Math.max(1, Math.min(2, globalThis.devicePixelRatio || 1));

export const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

export const rand = (a: number, b: number) => a + Math.random() * (b - a);

export const dist2 = (a: Vec2, b: Vec2) => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy;
};

export const collideCircle = (a: Entity, b: Entity) =>
    dist2(a.pos, b.pos) < (a.radius + b.radius) ** 2;
