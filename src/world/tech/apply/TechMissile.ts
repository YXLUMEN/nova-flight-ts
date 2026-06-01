import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechMissile implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.MISSILE_WEAPON.getDefaultStack();
        player.addItem(Items.MISSILE_WEAPON, stack);

        ServerTechUtil.onUnlockExplosionWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.MISSILE_WEAPON);
    }
}
