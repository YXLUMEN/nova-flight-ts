import {GameEvent} from "./GameEvent.ts";
import type {MissileEntity} from "../../entity/projectile/MissileEntity.ts";

export class MissileLockEntity extends GameEvent {
    public readonly missile: MissileEntity;

    public constructor(missile: MissileEntity) {
        super('entity:missile:locked');
        this.missile = missile;
    }
}