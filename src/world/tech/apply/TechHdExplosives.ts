import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechHdExplosives implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.EXPLOSION_POWER);
            if (!base) return;
            stack.set(DataComponents.EXPLOSION_POWER, base * 1.4);
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.EXPLOSION_POWER);
            if (!base) return;
            stack.removeChange(DataComponents.EXPLOSION_POWER);
            player.syncStack(stack);
        });
    }
}
