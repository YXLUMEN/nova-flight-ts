import {GameEvent} from "./GameEvent.ts";
import type {Entity} from "../../entity/Entity.ts";

export class EmpBurstEvent extends GameEvent {
    public readonly entity: Entity;
    public readonly duration: number;

    public constructor(entity: Entity, duration: number) {
        super('world:emp_burst');
        this.entity = entity;
        this.duration = duration;
    }
}