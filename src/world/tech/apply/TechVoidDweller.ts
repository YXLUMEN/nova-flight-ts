import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {VoidEnginWeapon} from "../../../item/weapon/VoidEnginWeapon.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechVoidDweller implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const intoVoid = Items.VOID_ENGIN as VoidEnginWeapon;
        const stack = player.getItem(intoVoid);
        if (stack.isEmpty()) return;

        stack.set(DataComponents.EFFECT_DURATION, stack.getOr(DataComponents.EFFECT_DURATION, 1) * 2);
        intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 1.4);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.VOID_ENGIN);
        if (stack.isEmpty()) return;

        stack.removeChange(DataComponents.EFFECT_DURATION);
        stack.removeChange(DataComponents.MAX_COOLDOWN);
        player.syncStack(stack);
    }
}
