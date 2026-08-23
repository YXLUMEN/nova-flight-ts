import {GameEvent} from "./GameEvent.ts";
import type {Explosion} from "../../world/element/explosion/Explosion.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class ExplosionEvent extends GameEvent {
    public readonly world: ServerWorld;
    public readonly explosion: Explosion;

    public constructor(world: ServerWorld, explosion: Explosion) {
        super('world:explosion');
        this.world = world;
        this.explosion = explosion;
    }
}