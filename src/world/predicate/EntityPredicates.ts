import type {Entity} from "../../entity/Entity.ts";
import type {Predicate} from "../../type/types.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import {squareDist, squareDistVec2} from "../../utils/math/math.ts";
import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";
import {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";

export class EntityPredicates {
    public static readonly ONLY_PLAYER = (entity: Entity) => entity instanceof PlayerEntity;
    public static readonly ALIVE_NOT_PLAYER = (entity: Entity) => entity.isAlive() && !entity.isPlayer();
    public static readonly MOB = (entity: Entity) => entity instanceof MobEntity;
    public static readonly IS_ALIVE = (entity: Entity) => entity.isAlive();

    public static inRangeVec(center: Vec2, radius: number) {
        const r2 = radius * radius;
        return (entity: Entity) => squareDistVec2(center, entity.positionRef) <= r2;
    }

    public static inRange(x: number, y: number, radius: number) {
        const r2 = radius * radius;
        return (entity: Entity) => squareDist(x, y, entity.getX(), entity.getY()) <= r2;
    }

    public static all(predicates: Predicate<Entity>[]) {
        return (entity: Entity) => {
            for (const predicate of predicates) {
                if (!predicate(entity)) return false;
            }
            return true;
        }
    }

    public static defense(owner: Entity) {
        return (entity: Entity) => {
            return entity instanceof ProjectileEntity && entity.isAlive() && entity.getOwner() !== owner;
        }
    }
}