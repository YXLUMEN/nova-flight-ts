import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechCloudLightning implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = new ItemStack(Items.CLOUD_LIGHTNING);
        player.addItem(Items.CLOUD_LIGHTNING, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        ServerTechUtil.onArcWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.CLOUD_LIGHTNING);
    }
}
