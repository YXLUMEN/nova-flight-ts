import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechAggressiveAlgorithms implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.POINT_DEFENSE);
        if (stack.isEmpty()) return stack;

        stack.set(DataComponents.DEFENSE_ACTIVE_ATTACK, true);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.POINT_DEFENSE);
        if (stack.isEmpty()) return stack;

        stack.remove(DataComponents.DEFENSE_ACTIVE_ATTACK);
        player.syncStack(stack);
    }
}