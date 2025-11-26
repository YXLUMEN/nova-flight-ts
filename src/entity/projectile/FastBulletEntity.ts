import {BulletEntity} from "./BulletEntity.ts";
import type {EntityType} from "../EntityType.ts";
import {World} from "../../world/World.ts";
import type {PlayerEntity} from "../player/PlayerEntity.ts";
import type {Entity} from "../Entity.ts";
import {LivingEntity} from "../LivingEntity.ts";

export class FastBulletEntity extends BulletEntity {
    public constructor(type: EntityType<FastBulletEntity>, world: World, owner: Entity | null, damage: number) {
        super(type, world, owner, damage);
    }

    public override tick() {
        super.tick();

        if (!this.getWorld().isClient) return;
        this.getWorld().addParticle(
            this.prevX, this.prevY,
            0, 0,
            0.5, 2,
            '#fffce9', '#bcbcbc'
        );
    }

    public override onEntityHit(entity: Entity) {
        this.discard();

        const sources = this.getWorld().getDamageSources();
        const owner = this.getOwner() as PlayerEntity;

        if (owner.isPlayer() && owner.getTechs().isUnlocked('apfs_discarding_sabot')) {
            let damage = this.damage;
            if (entity instanceof LivingEntity) damage = this.damage + (entity.getMaxHealth() * 0.3) | 0;
            else damage *= 2;
            entity.takeDamage(sources.playerAttack(owner), damage);
            return;
        }
        entity.takeDamage(sources.playerAttack(owner), this.damage);
    }
}