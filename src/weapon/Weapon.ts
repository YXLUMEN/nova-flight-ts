import {type Entity} from "../entity/Entity.ts";
import {type Game} from "../Game.ts";

export abstract class Weapon {
    protected cooldown = 0;
    public owner: Entity;

    constructor(owner: Entity) {
        this.owner = owner;
    }

    public update(delta: number) {
        if (this.cooldown > 0) this.cooldown = Math.max(0, this.cooldown - delta);
    }

    public abstract tryFire(game: Game, cd: boolean): void;

    public abstract get getMaxCooldown(): number;

    public get getCooldown(): number {
        return this.cooldown;
    }

    public abstract get displayName(): string;

    public abstract get uiColor(): string;
}
