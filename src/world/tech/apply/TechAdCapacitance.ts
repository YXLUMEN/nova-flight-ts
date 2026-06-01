import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {EMPWeapon} from "../../../item/weapon/EMPWeapon.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechAdCapacitance implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const emp = Items.EMP_WEAPON as EMPWeapon;
        const stack = player.getItem(emp);
        if (!stack) return;

        const base = stack.getOr(DataComponents.EFFECT_RANGE, 480);
        stack.set(DataComponents.EFFECT_RANGE, base * 1.5);
        emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.EMP_WEAPON);
        if (stack.isEmpty()) return;

        stack.removeChange(DataComponents.EFFECT_RANGE);
        stack.removeChange(DataComponents.MAX_COOLDOWN);
    }
}
