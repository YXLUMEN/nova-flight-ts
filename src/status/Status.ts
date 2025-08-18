import type {Entity} from "../entity/Entity.ts";
import type {World} from "../World.ts";

export abstract class Status {
    protected readonly duration: number;
    protected elapsed = 0;

    protected constructor(duration: number) {
        this.duration = duration;
    }

    public update(world: World, entity: Entity, dt: number) {
        this.elapsed += dt;
        this.apply(world, entity, dt);
    }

    public get expired() {
        return this.elapsed >= this.duration;
    }

    public abstract getTag(): string;

    protected abstract apply(world: World, entity: Entity, dt: number): void;
}