import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechHvWarhead implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.EXPLOSION_RADIUS);
            if (!base) return;
            stack.set(DataComponents.EXPLOSION_RADIUS, base * 1.5);
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.EXPLOSION_RADIUS);
            if (!base) return;
            stack.removeChange(DataComponents.EXPLOSION_RADIUS);
            player.syncStack(stack);
        });
    }
}
