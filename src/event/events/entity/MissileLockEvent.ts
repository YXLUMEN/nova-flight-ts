import {GameEvent} from "../GameEvent.ts";
import type {MissileEntity} from "../../../entity/projectile/MissileEntity.ts";
import type {Entity} from "../../../entity/Entity.ts";

export class MissileLockEvent extends GameEvent {
    public readonly missile: MissileEntity;
    public readonly target: Entity | null;
    public readonly lastTarget: Entity | null;

    public constructor(missile: MissileEntity, target: Entity | null, lastTarget: Entity | null) {
        super('entity:missile:locked');
        this.missile = missile;
        this.target = target;
        this.lastTarget = lastTarget;
    }
}