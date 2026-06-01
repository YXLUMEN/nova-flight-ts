import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";

export class TechDecoyReleaser implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = Items.DECOY_RELEASER.getDefaultStack();
        player.addItem(Items.DECOY_RELEASER, stack);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(Items.DECOY_RELEASER);
    }
}
