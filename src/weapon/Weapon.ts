import {type World} from "../world/World.ts";
import {clamp} from "../utils/math/math.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";

export abstract class Weapon {
    public readonly owner: LivingEntity;
    public damage: number;

    private maxCooldown: number;
    private cooldown: number = 0;

    protected constructor(owner: LivingEntity, damage: number, maxCooldown: number) {
        this.owner = owner;
        this.damage = damage;
        this.maxCooldown = maxCooldown;
    }

    public tick() {
        if (this.cooldown > 0 && this.shouldCooldown()) this.setCooldown(this.cooldown - 1);
    }

    // 不会检查冷却
    public abstract tryFire(world: World): void;

    public onStartFire(_world: World): void {
    }

    public onEndFire(_world: World): void {
    }

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

    public shouldCooldown(): boolean {
        return true;
    }

    public abstract getDisplayName(): string;

    public abstract getUiColor(): string;
}
