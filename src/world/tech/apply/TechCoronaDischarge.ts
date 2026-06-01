import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {BitFlag} from "../../../utils/BitFlag.ts";
import {WeaponType} from "../../../item/WeaponType.ts";

export class TechCoronaDischarge implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        for (const stack of player.getInventory()) {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (type === null || !BitFlag.has(type, WeaponType.ARC)) continue;

            const base = stack.get(DataComponents.ATTACK_RANGE);
            if (!base) continue;
            stack.set(DataComponents.ATTACK_RANGE, Math.ceil(base * 1.2));
            player.syncStack(stack);
        }
    }

    public remove(player: ServerPlayerEntity) {
        for (const stack of player.getInventory()) {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (type === null || !BitFlag.has(type, WeaponType.ARC)) continue;

            const base = stack.get(DataComponents.ATTACK_RANGE);
            if (!base) continue;
            stack.removeChange(DataComponents.ATTACK_RANGE);
            player.syncStack(stack);
        }
    }
}
