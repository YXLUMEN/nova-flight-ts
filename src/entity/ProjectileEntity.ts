import {Entity} from "./Entity.ts";
import {type MutVec2} from "../math/MutVec2.ts";
import {World} from "../World.ts";
import {type Vec2} from "../math/Vec2.ts";
import type {IOwnable} from "./IOwnable.ts";

export abstract class ProjectileEntity extends Entity implements IOwnable {
    public readonly damage: number;
    public readonly owner: Entity;
    public color = "#8cf5ff";

    private vel: Vec2;

    public constructor(world: World, pos: MutVec2, vel: Vec2, owner: Entity, damage: number, radius: number) {
        super(world, pos.clone(), radius);

        this.vel = vel;
        this.damage = damage;
        this.owner = owner;
    }

    public override tick(dt: number) {
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        if (this.pos.y < -20 || this.pos.y > World.H + 20 || this.pos.x < -20 || this.pos.x > World.W + 20) {
            this.discard();
        }
    }

    public abstract onEntityHit(entity: Entity): void;

    public getOwner(): Entity {
        return this.owner;
    }
}