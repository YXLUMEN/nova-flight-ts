import type {Entity} from "../entity/Entity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {Predicate} from "../apis/types.ts";
import {squareDistVec2} from "../utils/math/math.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class EntityPredicates {
    public static readonly ANY = () => true;
    public static readonly NONE = () => false;
    public static readonly DEFENSE = (entity: Entity) => entity instanceof ProjectileEntity && entity.isAlive() && !(entity.getOwner() instanceof PlayerEntity);
    public static readonly ONLY_PLAYER = (entity: Entity) => entity instanceof PlayerEntity;

    public static inRange(center: IVec, r2: number) {
        return (entity: Entity) => squareDistVec2(center, entity.getPositionRef) <= r2;
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