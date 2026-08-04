import {GameEvent} from "./GameEvent.ts";
import type {PlayerEntity} from "../../entity/player/PlayerEntity.ts";

export class PlayerDead extends GameEvent {
    public readonly player: PlayerEntity;

    public constructor(player: PlayerEntity) {
        super('entity:player:dead', true);
        this.player = player;
    }
}