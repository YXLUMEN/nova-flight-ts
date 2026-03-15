import type {Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";

export class EntityPredicates {
    public static readonly ALL = () => true;
    public static readonly ALIVE = (entity: Entity) => entity.isAlive();
    public static readonly ONLY_PLAYER = (entity: Entity) => entity instanceof PlayerEntity;
    public static readonly NOT_PLAYER = (entity: Entity) => !(entity instanceof PlayerEntity);
    public static readonly ONLY_MOB = (entity: Entity) => entity instanceof MobEntity;
    public static readonly ONLY_PROJECTILES = (entity: Entity) => entity instanceof ProjectileEntity;
    public static readonly DEFENSE = (entity: Entity) => entity instanceof ProjectileEntity && entity.isAlive() && !(entity.getOwner() instanceof PlayerEntity);
}