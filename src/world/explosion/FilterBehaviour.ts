import {ExplosionBehavior} from "./ExplosionBehavior.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {Predicate} from "../../type/types.ts";

export class FilterBehaviour extends ExplosionBehavior {
    public filter: Predicate<Entity> | null = null;

    public override canDamage(entity: Entity): boolean {
        return this.filter !== null ? this.filter(entity) : true;
    }

    public withFiler(filter: Predicate<Entity>) {
        this.filter = filter;
        return this;
    }
}