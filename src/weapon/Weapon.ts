import type {Entity} from "../entity/Entity.ts";

export abstract class Weapon {
    protected cooldown = 0;

    public owner: Entity;

    constructor(owner: Entity) {
        this.owner = owner;
    }

    public update(delta: number) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - delta);
    }

    public abstract tryFire(): void;
}
