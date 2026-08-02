import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";

export class TechSmokeLauncher implements ApplyTech {
    public apply(player: ServerPlayerEntity): void {
        player.addItem(Items.SMOKE_LAUNCHER);
    }

    public remove(player: ServerPlayerEntity): void {
        player.removeItem(Items.SMOKE_LAUNCHER);
    }
}