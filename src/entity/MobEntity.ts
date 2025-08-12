import {LivingEntity} from "./LivingEntity.ts";
import type {Vec2} from "../math/Vec2.ts";

export abstract class MobEntity extends LivingEntity {
    public readonly score: number;

    protected constructor(pos: Vec2, radius: number, health: number, score: number) {
        super(pos, radius, health);
        this.score = score;
    }
}