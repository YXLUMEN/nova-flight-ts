import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechFlakArtillery implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.FLAK_BATTERY);
        if (stack.isEmpty()) return;

        stack.set(DataComponents.MAX_DEFENSE, 3);
        stack.set(DataComponents.ATTACK_DAMAGE, 3);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.FLAK_BATTERY);
        if (stack.isEmpty()) return;

        stack.set(DataComponents.MAX_DEFENSE, 2);
        stack.set(DataComponents.ATTACK_DAMAGE, 2);
        player.syncStack(stack);
    }
}
