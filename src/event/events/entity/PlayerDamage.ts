import {GameEvent} from "../GameEvent.ts";
import type {DamageSource} from "../../../entity/damage/DamageSource.ts";
import type {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";

export class PlayerDamage extends GameEvent {
    public readonly player: PlayerEntity;
    public readonly origin: number;
    public readonly remain: number;
    public readonly source: DamageSource;

    public constructor(player: PlayerEntity, origin: number, remain: number, source: DamageSource) {
        super('entity:player:damage', true);
        this.player = player;
        this.origin = origin;
        this.remain = remain;
        this.source = source;
    }
}