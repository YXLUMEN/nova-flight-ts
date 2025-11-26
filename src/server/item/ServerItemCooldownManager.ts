import {ItemCooldownManager} from "../../item/ItemCooldownManager.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {Item} from "../../item/Item.ts";
import {ItemCooldownUpdateS2CPacket} from "../../network/packet/s2c/ItemCooldownUpdateS2CPacket.ts";

export class ServerItemCooldownManager extends ItemCooldownManager {
    private player: ServerPlayerEntity | null = null;

    public setPlayer(player: ServerPlayerEntity): void {
        this.player = player;
    }

    protected override onCooldownUpdate(item: Item, duration: number = 0) {
        super.onCooldownUpdate(item, duration);
        this.player?.networkHandler?.send(new ItemCooldownUpdateS2CPacket(item, duration));
    }
}