import {ExplosionConfigs} from "./ExplosionConfigs.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {Predicate} from "../../../type/types.ts";

export class FilterConfigs extends ExplosionConfigs {
    public filter: Predicate<Entity> | null = null;

    public override canDamage(entity: Entity): boolean {
        return this.filter !== null ? this.filter(entity) : true;
    }

    public withFiler(filter: Predicate<Entity>) {
        this.filter = filter;
        return this;
    }
}