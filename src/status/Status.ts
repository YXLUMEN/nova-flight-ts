import type {Entity} from "../entity/Entity.ts";

export abstract class Status {
    protected duration: number;
    protected elapsed = 0;

    protected constructor(duration: number) {
        this.duration = duration;
    }

    public update(entity: Entity, dt: number) {
        this.elapsed += dt;
        this.apply(entity, dt);
    }

    public get expired() {
        return this.elapsed >= this.duration;
    }

    // 子类实现具体效果
    protected abstract apply(entity: Entity, dt: number): void;
}