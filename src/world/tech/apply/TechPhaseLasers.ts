import type {ApplyTech} from "../ApplyTech.ts";
import {type ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechPhaseLasers implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.PHASE_LASERS.getDefaultStack();
        player.addItem(Items.PHASE_LASERS, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        ServerTechUtil.onHasHeatWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.PHASE_LASERS);
    }
}