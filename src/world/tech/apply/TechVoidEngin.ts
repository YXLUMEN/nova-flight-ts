import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";

export class TechVoidEngin implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.VOID_ENGIN.getDefaultStack();
        player.addItem(Items.VOID_ENGIN, stack);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.VOID_ENGIN);
    }
}
