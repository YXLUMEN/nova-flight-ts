import type {Entity} from "../../entity/Entity.ts";
import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";
import type {Predicate} from "../../type/types.ts";
import {squareDistVec2} from "../../utils/math/math.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";

export class EntityPredicates {
    public static readonly ANY = () => true;
    public static readonly NONE = () => false;
    public static readonly DEFENSE = (entity: Entity) => entity instanceof ProjectileEntity && entity.isAlive() && !(entity.getOwner() instanceof PlayerEntity);
    public static readonly ONLY_PLAYER = (entity: Entity) => entity instanceof PlayerEntity;
    public static readonly ALIVE_NOT_PLAYER = (entity: Entity) => entity.isAlive() && !entity.isPlayer();
    public static readonly MOB = (entity: Entity) => entity instanceof MobEntity;
    public static readonly POSSIBLE_MOB = (entity: Entity) => entity.valueOf() instanceof MobEntity;

    public static inRange(center: Vec2, r2: number) {
        return (entity: Entity) => squareDistVec2(center, entity.positionRef) <= r2;
    };

    public static canBePushBy() {

    }

    public static all(predicates: Predicate<Entity>[]) {
        return (entity: Entity) => {
            for (const predicate of predicates) {
                if (!predicate(entity)) return false;
            }
            return true;
        }
    }
}