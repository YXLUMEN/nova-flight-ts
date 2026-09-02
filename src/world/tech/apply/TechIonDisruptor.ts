import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechIonDisruptor implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.ION_DISRUPTOR.getDefaultStack();
        player.addItem(Items.ION_DISRUPTOR, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.ION_DISRUPTOR);
    }
}