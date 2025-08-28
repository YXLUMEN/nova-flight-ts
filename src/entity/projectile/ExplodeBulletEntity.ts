import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {ExplosionOpts} from "../../apis/IExplosionOpts.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {EntityType} from "../EntityType.ts";

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

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const attacker = this.owner instanceof LivingEntity ? this.owner : null;
        entity.takeDamage(this.getWorld().getDamageSources().explosion(this, attacker), this.damage);
        this.getWorld().events.emit('bomb-detonate', {
            pos: this.getMutPos.clone(),
            source: this,
            attacker,
            ...this.explosionOpts
        });
    }
}