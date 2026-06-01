import type {ApplyTech} from "../ApplyTech.ts";
import {type ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechKineticArtillery implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = new ItemStack(Items.KINETIC_ARTILLERY);
        player.addItem(Items.KINETIC_ARTILLERY, stack);

        ServerTechUtil.onUnlockBulletWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.KINETIC_ARTILLERY);
    }
}