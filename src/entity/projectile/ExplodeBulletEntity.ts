import {ProjectileEntity} from "../ProjectileEntity.ts";
import {BombWeapon} from "../../weapon/BombWeapon.ts";
import type {World} from "../../World.ts";
import type {Vec2} from "../../math/Vec2.ts";
import {Entity} from "../Entity.ts";
import {PI2} from "../../math/math.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    private readonly explodeRadius: number;

    public constructor(pos: Vec2, vel: Vec2, owner: Entity, damage: number, radius: number, explodeRadius: number) {
        super(pos, vel, owner, damage, radius);

        this.explodeRadius = explodeRadius;
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, PI2);
        ctx.fill();
        ctx.restore();
    }

    public override onHit(world: World): void {
        this.onDeath();

        const center = this.pos.clone();
        BombWeapon.applyBombDamage(world, center, this.explodeRadius, this.damage);
        world.events.emit('bomb-detonate', {
            pos: center,
            radius: this.explodeRadius,
            sparks: 6,
            fastSparks: 2
        });
    }
}