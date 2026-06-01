import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import {Items} from "../../../item/Items.ts";
import {DataComponents} from "../../../component/DataComponents.ts";

export class TechHoneycombMissile implements ApplyTech {
    public apply(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.MISSILE_WEAPON);
        if (stack.isEmpty()) return;

        stack.set(DataComponents.LAUNCH_COUNT, 24);
        stack.set(DataComponents.ATTACK_DAMAGE, 3);
        stack.set(DataComponents.EXPLOSION_POWER, 6);
        stack.set(DataComponents.EXPLOSION_RADIUS, 48);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        const stack = player.getItem(Items.MISSILE_WEAPON);
        if (stack.isEmpty()) return;

        stack.removeChange(DataComponents.LAUNCH_COUNT);
        stack.removeChange(DataComponents.ATTACK_DAMAGE);
        stack.removeChange(DataComponents.EXPLOSION_POWER);
        stack.removeChange(DataComponents.EXPLOSION_RADIUS);
        player.syncStack(stack);
    }
}
