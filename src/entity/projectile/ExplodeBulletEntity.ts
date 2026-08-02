import {ProjectileEntity} from "./ProjectileEntity.ts";
import type {World} from "../../world/World.ts";
import {Entity} from "../Entity.ts";
import type {EntityType} from "../EntityType.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {EntityHitResult} from "../../world/collision/EntityHitResult.ts";
import type {BlockHitResult} from "../../world/collision/BlockHitResult.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import {ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";

export class ExplodeBulletEntity extends ProjectileEntity {
    public override color = '#ffae00';

    private readonly power: number;
    private readonly behaviour: ExplosionBehavior;
    private readonly visual: ExplosionVisual

    public constructor(
        type: EntityType<ExplodeBulletEntity>,
        world: World,
        owner: Entity,
        damage: number,
        power: number,
        behaviour?: ExplosionBehavior,
        visual?: ExplosionVisual
    ) {
        super(type, world, owner, damage);
        this.power = power;
        this.behaviour = behaviour ?? new ExplosionBehavior();
        this.visual = visual ?? new ExplosionVisual();
    }

    public override tick() {
        super.tick();

        const world = this.getWorld();
        if (!world.isClient || this.age >= 15) return;

        const yaw = this.getYaw();
        const height = this.getHeight();
        const offsetX = -Math.cos(yaw) * height;
        const offsetY = -Math.sin(yaw) * height;

        world.addPreparedParticle(
            ParticleEffects.EMBER,
            this.prevX + offsetX, this.prevY + offsetY,
            1
        );
    }

    protected override onEntityHit(hitResult: EntityHitResult): void {
        const world = this.getWorld();
        if (world.isClient) {
            world.playSound(null, SoundEvents.MISSILE_EXPLOSION, 0.3);
            return;
        }

        this.discard();
        const attacker = this.getOwner();
        hitResult.entity.takeDamage(this.getWorld().getDamageSources().projectile(this, attacker), this.getHitDamage());
        world.createExplosion(this, null, this.getX(), this.getY(), this.power, this.behaviour, this.visual);

        world.playSound(this.getOwner(), SoundEvents.MISSILE_EXPLOSION, 0.3);
    }

    protected override onBlockHit(hitResult: BlockHitResult) {
        super.onBlockHit(hitResult);

        const world = this.getWorld();
        if (world.isClient) {
            world.playSound(null, SoundEvents.MISSILE_EXPLOSION, 0.3);
            return;
        }
        world.createExplosion(this, null, hitResult.pos.x, hitResult.pos.y, this.power, this.behaviour, this.visual);
        world.playSound(this.getOwner(), SoundEvents.MISSILE_EXPLOSION, 0.3);
    }
}