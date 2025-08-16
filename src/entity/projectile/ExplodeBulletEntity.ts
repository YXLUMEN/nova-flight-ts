import {ProjectileEntity} from "../ProjectileEntity.ts";
import {BombWeapon} from "../../weapon/BombWeapon.ts";
import type {World} from "../../World.ts";
import type {Vec2} from "../../math/Vec2.ts";
import {Entity} from "../Entity.ts";
import {PI2} from "../../math/math.ts";
import type {ExplosionOpts} from "../../apis/IExplosionOpts.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    private readonly explosionOpts: ExplosionOpts

    public constructor(pos: Vec2, vel: Vec2, owner: Entity, damage: number, radius: number, explosionOpts: ExplosionOpts = {}) {
        super(pos, vel, owner, damage, radius);

        this.explosionOpts = {
            damage: damage,
            visionRadius: radius,
            ...explosionOpts
        }
    }

    public render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.boxRadius, 0, PI2);
        ctx.fill();
        ctx.restore();
    }

    public override onHit(world: World): void {
        this.onDeath(world);

        const center = this.pos.clone();
        BombWeapon.applyBombDamage(world, center, this.explosionOpts.visionRadius!, this.explosionOpts.damage!);
        world.events.emit('bomb-detonate', {
            pos: center,
            ...this.explosionOpts
        });
    }

    public static spawnExplodeBullet(
        world: World, pos: Vec2, vel: Vec2,
        own: Entity, damage: number, radius: number,
        explosionOpts?: ExplosionOpts
    ): void {
        const b = new ExplodeBulletEntity(pos, vel, own, damage, radius, explosionOpts);
        b.color = '#ffb122';
        world.bullets.push(b);
    }
}