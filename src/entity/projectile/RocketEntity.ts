import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {clamp} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";

export class RocketEntity extends ProjectileEntity {
    public explosionRadius = 64;
    public explosionDamage = 10;
    public override color = "#ffaa4d";
    protected explodeColor = "#e3e3e3";

    private readonly maxHealth: number;
    private health: number;

    public constructor(type: EntityType<RocketEntity>, world: World, owner: Entity | null, damage: number = 8, health: number = 6) {
        super(type, world, owner, damage);
        this.maxHealth = health;
        this.health = health;
    }

    public override onEntityHit(entity: Entity): void {
        const damage = this.getHitDamage();
        const sources = this.getWorld().getDamageSources();
        entity.takeDamage(sources.projectile(this, this.getOwner()), damage);

        this.explode();
        this.discard();
    }

    public override onIntercept(damage: number): void {
        this.health = clamp(this.health - damage, 0, this.maxHealth);
        if (this.health === 0) {
            this.explode();
            this.discard();
        }
    }

    public explode(damageSource?: DamageSource) {
        this.getWorld().createExplosion(this, damageSource ?? null, this.getX(), this.getY(), {
            damage: this.explosionDamage,
            explosionRadius: this.explosionRadius,
            fastSparks: 2,
            sparks: 5,
            explodeColor: this.explodeColor,
        });
    }
}