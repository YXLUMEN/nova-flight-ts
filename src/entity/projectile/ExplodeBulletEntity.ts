import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {ExplosionOpts} from "../../apis/IExplosionOpts.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {EVENTS} from "../../apis/IEvents.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    public override color = '#ffae00';
    private readonly explosionOpts: ExplosionOpts

    public constructor(type: EntityType<ExplodeBulletEntity>, world: World, owner: LivingEntity, damage: number, explosionOpts: ExplosionOpts) {
        super(type, world, owner, damage);

        this.explosionOpts = {
            damage: damage,
            ...explosionOpts
        }
    }

    public override onEntityHit(entity: Entity): void {
        this.discard();

        const attacker = this.owner;
        entity.takeDamage(this.getWorld().getDamageSources().explosion(this, attacker), this.damage);
        this.getWorld().events.emit(EVENTS.BOMB_DETONATE, {
            pos: this.getMutPos.clone(),
            source: this,
            attacker,
            ...this.explosionOpts
        });
    }
}