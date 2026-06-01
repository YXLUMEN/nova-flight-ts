import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";

export class TechSentinelPointDefense implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.POINT_DEFENSE.getDefaultStack();
        player.addItem(Items.POINT_DEFENSE, stack);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.POINT_DEFENSE);
    }
}
