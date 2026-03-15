import type {IVec} from "../../utils/math/IVec.ts";
import type {Entity} from "../../entity/Entity.ts";
import {HitResult, type HitType} from "./HitResult.ts";

export class EntityHitResult extends HitResult {
    public readonly entity: Entity;

    public constructor(pos: IVec, entity: Entity) {
        super(pos)
        this.entity = entity;
    }

    public static create(entity: Entity) {
        return new EntityHitResult(entity.getPosition(), entity);
    }

    public getType(): HitType {
        return 2;
    }
}