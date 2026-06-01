import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";
import type {ApplyTech} from "../ApplyTech.ts";
import {Items} from "../../../item/Items.ts";

export class TechEnergyForce implements ApplyTech {
    public apply(player: ServerPlayerEntity): void {
        const stack = Items.EMP_WEAPON.getDefaultStack();
        player.addItem(Items.EMP_WEAPON, stack);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity): void {
        player.removeItem(Items.EMP_WEAPON);
    }
}