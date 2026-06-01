import type {ApplyTech} from "../ApplyTech.ts";
import {type ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {BitFlag} from "../../../utils/BitFlag.ts";
import {WeaponType} from "../../../item/WeaponType.ts";

export class TechHdBullet implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (type === null || !BitFlag.has(type, WeaponType.KINETIC)) return;

            const base = stack.get(DataComponents.ATTACK_DAMAGE);
            if (!base) return;
            stack.set(DataComponents.ATTACK_DAMAGE, Math.ceil(base * 2));
            player.syncStack(stack);
        });
    }

    public remove(player: ServerPlayerEntity) {
        player.getInventory().values().forEach(stack => {
            const type = stack.get(DataComponents.WEAPON_TYPE);
            if (type === null || !BitFlag.has(type, WeaponType.KINETIC)) return;

            const base = stack.get(DataComponents.ATTACK_DAMAGE);
            if (!base) return;
            stack.removeChange(DataComponents.ATTACK_DAMAGE);
            player.syncStack(stack);
        });
    }
}
