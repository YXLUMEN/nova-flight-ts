import {DataComponents} from "../../component/DataComponents.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {Techs} from "../../world/tech/Techs.ts";

export class ServerTechUtil {
    public static onUnlockBulletWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HD_BULLET)) {
            const base = stack.getOr(DataComponents.ATTACK_DAMAGE, 1);
            stack.set(DataComponents.ATTACK_DAMAGE, base * 2);
        }

        if (tech.isUnlocked(Techs.AD_LOADING)) {
            const item = stack.getItem();
            if (item instanceof BaseWeapon) {
                if (item.getFireRate(stack) <= 1) return;

                item.setFireRate(stack, item.getFireRate(stack) * 0.8);
            }
        }
    }

    public static onUnlockExplosionWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HV_WARHEAD)) {
            const base = stack.get(DataComponents.EXPLOSION_RADIUS);
            if (base) stack.set(DataComponents.EXPLOSION_RADIUS, base * 1.5);
        }

        if (tech.isUnlocked(Techs.HD_EXPLOSIVES)) {
            const base = stack.get(DataComponents.EXPLOSION_POWER);
            if (base) stack.set(DataComponents.EXPLOSION_POWER, base * 1.4);
        }
    }

    public static onEnergyWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HARMONIC_ANALYSIS)) {
            const base = stack.get(DataComponents.ATTACK_DAMAGE);
            if (base) stack.set(DataComponents.ATTACK_DAMAGE, base * 1.4);
        }
    }

    public static onArcWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.CORONA_DISCHARGE)) {
            const base = stack.get(DataComponents.ATTACK_RANGE);
            if (base) stack.set(DataComponents.ATTACK_RANGE, Math.ceil(base * 1.2));
        }
    }

    public static onHasHeatWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HIGH_TEMPERATURE_ALLOY)) {
            const base = stack.get(DataComponents.MAX_HEAT);
            if (base) stack.set(DataComponents.MAX_HEAT, Math.ceil(base * 1.5));
        }
    }
}

