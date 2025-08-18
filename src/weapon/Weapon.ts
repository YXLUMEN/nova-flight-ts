import {type Entity} from "../entity/Entity.ts";
import {type World} from "../World.ts";
import {clamp} from "../math/math.ts";

export abstract class Weapon {
    public readonly owner: Entity;
    public damage: number;

    private maxCooldown: number;
    private cooldown: number = 0;

    protected constructor(owner: Entity, damage: number, maxCooldown: number) {
        this.owner = owner;
        this.damage = damage;
        this.maxCooldown = maxCooldown;
    }

    public update(delta: number) {
        if (this.cooldown > 0) this.setCooldown(this.cooldown - delta);
    }

    // 不会检查冷却
    public abstract tryFire(world: World): void;

    public canFire(): boolean {
        return this.getCooldown() <= 0;
    }

    public getDamage(): number {
        return this.damage;
    }

    public getMaxCooldown(): number {
        return this.maxCooldown;
    }

    public setMaxCooldown(value: number) {
        this.maxCooldown = clamp(value, 0, 256);
    }

    public getCooldown(): number {
        return this.cooldown;
    }

    public setCooldown(value: number) {
        this.cooldown = clamp(value, 0, this.maxCooldown);
    }

    public abstract getDisplayName(): string;

    public abstract getUiColor(): string;
}
