import {GameEvent} from "./GameEvent.ts";
import type {Explosion} from "../../world/element/explosion/Explosion.ts";

export class ExplosionEvent extends GameEvent {
    public readonly explosion: Explosion;

    public constructor(explosion: Explosion) {
        super('world:explosion');
        this.explosion = explosion;
    }
}