import type {ApplyTech} from "../ApplyTech.ts";
import {type ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {ItemStack} from "../../../item/ItemStack.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechArtillery125 implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = new ItemStack(Items.ARTILLERY125);
        player.addItem(Items.ARTILLERY125, stack);

        ServerTechUtil.onUnlockBulletWpn(stack, player)
        ServerTechUtil.onUnlockExplosionWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.ARTILLERY125);
    }
}