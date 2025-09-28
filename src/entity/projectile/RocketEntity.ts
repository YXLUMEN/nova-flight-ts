import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {LivingEntity} from "../LivingEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {EVENTS} from "../../apis/IEvents.ts";

export class RocketEntity extends ProjectileEntity {
    public explosionRadius = 64;
    public explosionDamage = 10;
    public override color = "#ffaa4d";
    protected explodeColor = "#e3e3e3";

    public constructor(type: EntityType<RocketEntity>, world: World, owner: Entity | null, damage: number = 8) {
        super(type, world, owner, damage);
    }

    public override onEntityHit(entity: Entity): void {
        this.explode();

        let damage = this.damage;
        const sources = this.getWorld().getDamageSources();
        if (entity instanceof LivingEntity) {
            damage += Math.max(1, (entity.getMaxHealth() - entity.getHealth()) * 0.3);
        }
        entity.takeDamage(sources.projectile(this, this.getOwner()), damage);

        this.discard();
    }

    public explode() {
        const world = this.getWorld();
        world.events.emit(EVENTS.BOMB_DETONATE, {
            source: this,
            damage: this.explosionDamage,
            attacker: this.getOwner(),
            pos: this.getPositionRef,
            explosionRadius: this.explosionRadius,
            fastSparks: 2,
            sparks: 5,
            explodeColor: this.explodeColor,
        });
        world.playSound(SoundEvents.MISSILE_EXPLOSION, 0.4);
    }
}