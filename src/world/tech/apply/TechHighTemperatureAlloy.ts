import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechHighTemperatureAlloy implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.MAX_HEAT);
            if (!base) return;
            stack.set(DataComponents.MAX_HEAT, Math.ceil(base * 1.5));
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.MAX_HEAT);
            if (!base) return;
            stack.removeChange(DataComponents.MAX_HEAT);
            player.syncStack(stack);
        });
    }
}