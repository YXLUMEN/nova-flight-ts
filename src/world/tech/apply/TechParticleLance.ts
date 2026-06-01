import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {ServerTechUtil} from "../../../server/tech/ServerTechUtil.ts";

export class TechParticleLance implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.PARTICLE_LANCE.getDefaultStack();
        player.addItem(Items.PARTICLE_LANCE, stack);

        ServerTechUtil.onEnergyWpn(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.PARTICLE_LANCE);
    }
}
