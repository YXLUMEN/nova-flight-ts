import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechHighEfficiencyCoolant implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.COOLDOWN_RATE);
            if (!base) return;
            stack.set(DataComponents.COOLDOWN_RATE, base * 1.5);
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const base = stack.get(DataComponents.COOLDOWN_RATE);
            if (!base) return;
            stack.removeChange(DataComponents.COOLDOWN_RATE);
            player.syncStack(stack);
        })
    }
}
