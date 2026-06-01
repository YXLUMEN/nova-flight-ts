import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechPerditionBeam implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.PERDITION_BEAM.getDefaultStack();
        player.addItem(Items.PERDITION_BEAM, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        ServerTechUtil.onHasHeatWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.PERDITION_BEAM);
    }
}
