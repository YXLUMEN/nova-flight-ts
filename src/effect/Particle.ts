import type {VisualEffect} from "./VisualEffect.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export interface Particle extends VisualEffect {
    reset(
        pos: Vec2, vel: Vec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag?: number
    ): void;
}