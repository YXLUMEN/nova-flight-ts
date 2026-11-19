import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {BitFlag} from "../../../utils/BitFlag.ts";
import {WeaponType} from "../../../item/WeaponType.ts";

export class TechParallelLoader implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (!type || !BitFlag.has(type, WeaponType.KINETIC)) return;

            stack.set(DataComponents.RELOAD_IN_BACKGROUND, true);
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (!type || !BitFlag.has(type, WeaponType.KINETIC)) return;

            stack.remove(DataComponents.RELOAD_IN_BACKGROUND);
            player.syncStack(stack);
        });
    }
}