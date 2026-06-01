import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechBarrierPointDefense implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.POINT_DEFENSE);
        if (stack.isEmpty()) return stack;

        stack.set(DataComponents.MAX_DEFENSE, 3);
        stack.set(DataComponents.ATTACK_DAMAGE, 2);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.POINT_DEFENSE);
        if (stack.isEmpty()) return stack;

        stack.removeChange(DataComponents.MAX_DEFENSE);
        stack.removeChange(DataComponents.ATTACK_DAMAGE);
        player.syncStack(stack);
    }
}
