import type {Item} from "../../../item/Item.ts";
import type {ItemStack} from "../../../item/ItemStack.ts";
import type {ApplyTech} from "../ApplyTech.ts";
import type {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import {ServerTechUtil} from "../ServerTechUtil.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {BitFlag} from "../../../utils/BitFlag.ts";
import {WeaponType} from "../../../item/WeaponType.ts";

export class TechGiveItem implements ApplyTech {
    private readonly item: Item;
    private readonly syncUpgrade: boolean;

    public constructor(item: Item, syncUpgrade: boolean = true) {
        this.item = item;
        this.syncUpgrade = syncUpgrade;
    }

    public apply(player: ServerPlayerEntity) {
        const stack = this.item.getDefaultStack();
        player.addItem(this.item, stack);

        this.modify(stack, player);
        player.syncStack(stack);
    }

    public remove(player: ServerPlayerEntity) {
        player.removeItem(this.item);
    }

    private modify(stack: ItemStack, player: ServerPlayerEntity): void {
        if (!this.syncUpgrade) return;

        const type = stack.get(DataComponents.WEAPON_TYPE);
        if (!type) return;

        if (BitFlag.has(type, WeaponType.KINETIC)) {
            ServerTechUtil.onUnlockBulletWpn(stack, player);
        }
        if (BitFlag.has(type, WeaponType.ENERGY)) {
            ServerTechUtil.onEnergyWpn(stack, player);
        }
        if (BitFlag.has(type, WeaponType.EXPLOSIVE)) {
            ServerTechUtil.onUnlockExplosionWpn(stack, player);
        }
        if (BitFlag.has(type, WeaponType.ARC)) {
            ServerTechUtil.onArcWpn(stack, player);
        }
        if (stack.has(DataComponents.MAX_HEAT)) {
            ServerTechUtil.onHasHeatWpn(stack, player);
        }
    }
}