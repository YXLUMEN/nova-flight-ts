import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {ExplosionOpts} from "../../apis/IExplosionOpts.ts";
import type {EntityType} from "../EntityType.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {randInt, randNeg} from "../../utils/math/math.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    public override color = '#ffae00';
    private readonly explosionOpts: ExplosionOpts

    public constructor(type: EntityType<ExplodeBulletEntity>, world: World, owner: Entity, damage: number, explosionOpts: ExplosionOpts) {
        super(type, world, owner, damage);

        this.explosionOpts = {
            damage: damage,
            ...explosionOpts
        }
    }

    public override tick() {
        super.tick();

        const world = this.getWorld();
        if (!world.isClient || this.age >= 25) return;

        const yaw = this.getYaw();
        const height = this.getHeight();
        const offsetX = -Math.cos(yaw) * height;
        const offsetY = -Math.sin(yaw) * height;

        world.addParticle(
            this.prevX + offsetX, this.prevY + offsetY,
            randNeg(10, 30), randNeg(10, 30),
            0.6, randInt(4, 8),
            '#ffd16b', '#cab981',
        );
    }

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const world = this.getWorld();
        const attacker = this.getOwner();
        entity.takeDamage(this.getWorld().getDamageSources().projectile(this, attacker), this.damage);
        world.createExplosion(this, null, this.getX(), this.getY(), {
            attacker,
            ...this.explosionOpts
        });

        world.playSound(this.getOwner(), SoundEvents.MISSILE_EXPLOSION, 0.3);
    }
}