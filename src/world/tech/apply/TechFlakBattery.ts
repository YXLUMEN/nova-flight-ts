import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";

export class TechFlakBattery implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.FLAK_BATTERY.getDefaultStack();
        player.addItem(Items.FLAK_BATTERY, stack);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.FLAK_BATTERY);
    }
}
