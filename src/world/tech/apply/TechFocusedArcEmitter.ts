import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechFocusedArcEmitter implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = new ItemStack(Items.FOCUSED_ARC_EMITTER);
        player.addItem(Items.FOCUSED_ARC_EMITTER, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        ServerTechUtil.onArcWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.FOCUSED_ARC_EMITTER);
    }
}
