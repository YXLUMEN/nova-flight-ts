import type {Entity} from "../entity/Entity.ts";
import type {World} from "../World.ts";

export abstract class StatusEffect {
    protected constructor() {
    }

    public abstract apply(world: World, entity: Entity, dt: number, amplifier: number): void;
}