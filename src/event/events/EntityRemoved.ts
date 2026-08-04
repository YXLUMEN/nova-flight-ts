import {GameEvent} from "./GameEvent.ts";
import type {Entity} from "../../entity/Entity.ts";

export class EntityRemoved extends GameEvent {
    public readonly entity: Entity;

    public constructor(entity: Entity) {
        super('entity:mob:removed');
        this.entity = entity;
    }
}