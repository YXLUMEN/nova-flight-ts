import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechSpaceTear implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.VOID_ENGIN);
        if (stack.isEmpty()) return;
        stack.set(DataComponents.EFFECT_RANGE, 128);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.VOID_ENGIN);
        if (stack.isEmpty()) return;
        stack.removeChange(DataComponents.EFFECT_RANGE);
        player.syncStack(stack);
    }
}
