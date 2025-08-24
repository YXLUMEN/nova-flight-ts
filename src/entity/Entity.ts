import {type MutVec2} from "../math/MutVec2.ts";
import {type World} from "../World.ts";
import {Vec2} from "../math/Vec2.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {Weapon} from "../weapon/Weapon.ts";

export abstract class Entity {
    private readonly world: World;
    private readonly position: MutVec2;
    private readonly _boxRadius: number;

    public speed: number = 0;

    public invulnerable: boolean = false;
    private dead: boolean;

    protected constructor(world: World, pos: MutVec2, boxRadius: number) {
        this.world = world;
        this.dead = false;

        this.position = pos;
        this._boxRadius = boxRadius;
    }

    public getWorld(): World {
        return this.world;
    }

    public tick(_dt: number): void {
    }

    public isInvulnerableTo(damageSource: DamageSource): boolean {
        return this.dead || this.invulnerable && !damageSource.isIn();
    }

    public takeDamage(damageSource: DamageSource, _amount: number): boolean {
        return this.isInvulnerableTo(damageSource);
    }

    public onDeath(_damageSource: DamageSource): void {
        this.discard();
    }

    public discard(): void {
        this.dead = true;
    }

    public isDead(): boolean {
        return this.dead;
    }

    public getWeaponStack(): Weapon | null {
        return null;
    }

    public get pos(): MutVec2 {
        return this.position;
    }

    public getPos(): Vec2 {
        return Vec2.formVec(this.position);
    }

    public get boxRadius(): number {
        return this._boxRadius;
    }

    public abstract render(ctx: CanvasRenderingContext2D): void;
}