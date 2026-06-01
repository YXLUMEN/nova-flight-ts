import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechRandomRocket implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.ROCKET_LAUNCHER);
        if (stack.isEmpty()) return stack;

        stack.set(DataComponents.MISSILE_RANDOM_ENABLE, true);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.ROCKET_LAUNCHER);
        if (stack.isEmpty()) return stack;

        stack.remove(DataComponents.MISSILE_RANDOM_ENABLE);
        player.syncStack(stack);
    }
}
