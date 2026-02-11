import {FastBulletEntity} from "./FastBulletEntity.ts";
import {type Entity} from "../Entity.ts";
import {PlayerEntity} from "../player/PlayerEntity.ts";
import {Techs} from "../../tech/Techs.ts";
import {LivingEntity} from "../LivingEntity.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class ArtilleryEntity extends FastBulletEntity {
    private readonly hit = new WeakSet<Entity>();

    public override onEntityHit(entity: Entity): void {
        if (this.hit.has(entity)) return;
        this.hit.add(entity);

        const world = this.getWorld();
        const sources = world.getDamageSources();
        const owner = this.getOwner();

        const hitDamage = this.getHitDamage();
        if (owner instanceof PlayerEntity && owner.getTechs().isUnlocked(Techs.ANTIMATTER_WARHEAD)) {
            let damage = hitDamage;
            if (entity instanceof LivingEntity) damage = hitDamage + (entity.getMaxHealth() * 0.08) | 0;
            else damage *= 2;
            entity.takeDamage(sources.kinetic(this, owner), damage);
            return;
        }

        entity.takeDamage(sources.kinetic(this, owner), hitDamage);
        if (!world.isClient) {
            (world as ServerWorld).spawnParticle(
                this.getX(), this.getY(), 0, 0,
                6, 100, 0.5, 4,
                '#ffd8b6'
            );
        }
    }
}