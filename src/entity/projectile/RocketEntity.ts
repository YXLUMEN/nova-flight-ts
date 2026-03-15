import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import {clamp} from "../../utils/math/math.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import type {ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";

export class RocketEntity extends ProjectileEntity {
    public explosionRadius = 64;
    public explosionDamage = 10;

    public override color = "#ffaa4d";
    protected explodeColor = "#e3e3e3";
    protected behaviour: ExplosionBehavior | null = null;

    private readonly maxHealth: number;
    private health: number;

    public constructor(
        type: EntityType<RocketEntity>,
        world: World,
        owner: Entity | null,
        damage: number = 8,
        health: number = 6) {
        super(type, world, owner, damage);

        this.maxHealth = health;
        this.health = health;
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        if (this.getWorld().isClient) return;

        const damage = this.getHitDamage();
        const sources = this.getWorld().getDamageSources();
        hitResult.entity.takeDamage(sources.projectile(this, this.getOwner()), damage);

        super.onEntityHit(hitResult);
        this.explode();
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        if (this.getWorld().isClient) return;
        super.onBlockHit(hitResult);
        this.explode();
    }

    public override onIntercept(damage: number): void {
        this.health = clamp(this.health - damage, 0, this.maxHealth);
        if (this.health === 0) {
            this.explosionDamage = 0;
            this.explode();
            this.discard();
        }
    }

    public explode(damageSource?: DamageSource) {
        this.getWorld().createExplosion(this, damageSource ?? null,
            this.getX(), this.getY(), this.explosionDamage,
            this.behaviour,
            new ExplosionVisual(this.explosionRadius, this.explodeColor, 5, 2)
        );
    }
}