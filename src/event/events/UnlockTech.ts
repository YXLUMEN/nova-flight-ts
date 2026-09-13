import {GameEvent} from "./GameEvent.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {PlayerEntity} from "../../entity/player/PlayerEntity.ts";

export class UnlockTech extends GameEvent {
    public readonly player: PlayerEntity;
    public readonly tech: Tech;
    public readonly silent: boolean;

    public constructor(player: PlayerEntity, tech: Tech, silent?: boolean) {
        super('player:tech:unlock');
        this.player = player;
        this.tech = tech;
        this.silent = silent ?? false;
    }
}