import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {World} from "../World.ts";
import type {MutVec2} from "../math/MutVec2.ts";
import {Entity} from "./Entity.ts";
import {PI2} from "../math/math.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import {LivingEntity} from "./LivingEntity.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    private readonly explosionOpts: ExplosionOpts

    public constructor(
        world: World, pos: MutVec2, vel: MutVec2,
        owner: Entity,
        damage: number, radius: number, explosionOpts: ExplosionOpts = {}) {
        super(world, pos, vel, owner, damage, radius);

        this.explosionOpts = {
            damage: damage,
            explosionRadius: radius,
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

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const attacker = this.owner instanceof LivingEntity ? this.owner : null;
        entity.takeDamage(this.getWorld().getDamageSources().explosion(this, attacker), this.damage);
        this.getWorld().events.emit('bomb-detonate', {
            pos: this.pos.clone(),
            source: this,
            attacker,
            ...this.explosionOpts
        });
    }

    public static spawnExplodeBullet(
        world: World, pos: MutVec2, vel: MutVec2,
        own: Entity, damage: number, radius: number,
        explosionOpts?: ExplosionOpts
    ): void {
        const b = new ExplodeBulletEntity(world, pos, vel, own, damage, radius, explosionOpts);
        b.color = '#ffb122';
        world.bullets.push(b);
    }
}