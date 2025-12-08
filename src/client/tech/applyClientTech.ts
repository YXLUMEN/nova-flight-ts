import {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";
import {LaserWeapon} from "../../item/weapon/LaserWeapon.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {IntoVoidWeapon} from "../../item/weapon/IntoVoidWeapon.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {AutoAim} from "./AutoAim.ts";
import {Items} from "../../item/Items.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import type {Tech} from "../../tech/Tech.ts";
import {Techs} from "../../tech/Techs.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";

export function applyClientTech(tech: RegistryEntry<Tech>): void {
    const player = NovaFlightClient.getInstance().player;
    if (!player) return;

    switch (tech) {
        case Techs.ENERGY_FORCE:
            player.addItem(Items.EMP_WEAPON);
            break;
        case Techs.LASER:
            player.addItem(Items.LASER_WEAPON);
            break;
        case Techs.HIGH_EFFICIENCY_COOLANT: {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = player.getItem(laser);
            if (stack) {
                laser.setCoolRate(stack, laser.getCoolRate(stack) * 1.5);
            }
            break;
        }
        case Techs.AD_CAPACITANCE: {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.getItem(emp);
            if (stack) {
                const base = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);
                stack.set(DataComponentTypes.EFFECT_RANGE, base * 1.5);
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
            }
            break;
        }
        case Techs.QUICK_CHARGE: {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.getItem(emp);
            if (stack) {
                const base = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);
                stack.set(DataComponentTypes.EFFECT_RANGE, base * 0.5);
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 0.5);
            }
            break;
        }
        case Techs.HARMONIC_ANALYSIS: {
            const stack = player.getItem(Items.LASER_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 2);
            }
            break;
        }
        case Techs.HIGH_TEMPERATURE_ALLOY: {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.MAX_HEAT);
                if (base) {
                    stack.set(DataComponentTypes.MAX_HEAT, Math.ceil(base * 1.5));
                }
            });
            break;
        }
        case Techs.GUNBOAT_FOCUS: {
            player.addItem(Items.MINIGUN_WEAPON);
            break;
        }
        case Techs.HD_BULLET:
            player.getInventory().values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) {
                    const base = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                    stack.set(DataComponentTypes.ATTACK_DAMAGE, Math.ceil(base * 2));
                }
            });
            break;
        case Techs.AD_LOADING: {
            player.getInventory().values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) item.setFireRate(stack, item.getFireRate(stack) * 0.8);
            });
            break;
        }
        case Techs.CANNON90: {
            const c90 = new ItemStack(Items.CANNON90_WEAPON);
            player.addItem(Items.CANNON90_WEAPON, c90);

            if (player.getTechs().isUnlocked(Techs.HD_BULLET)) {
                const base = c90.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                c90.set(DataComponentTypes.ATTACK_DAMAGE, base * 2);
            }
            break;
        }
        case Techs.HV_WARHEAD: {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.EXPLOSION_RADIUS);
                if (base) {
                    stack.set(DataComponentTypes.EXPLOSION_RADIUS, base * 1.5);
                }
            });
            break;
        }
        case Techs.HD_EXPLOSIVES: {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.EXPLOSION_DAMAGE);
                if (base) {
                    stack.set(DataComponentTypes.EXPLOSION_DAMAGE, base * 1.4);
                }
            });
            break;
        }
        case Techs.SHIP_OPT: {
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 0), null);

            if (player.getNormalTags().has('Repaired')) return;
            player.addNormalTag('Repaired');
            player.setHealth(player.getMaxHealth());
            break;
        }
        case Techs.INTO_VOID: {
            player.addItem(Items.INTO_VOID_WEAPON);
            break;
        }
        case Techs.VOID_LEAP: {
            const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
            const stack = player.getItem(intoVoid);
            if (stack) {
                stack.set(DataComponentTypes.EFFECT_DURATION, stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 1) * 0.1);
                intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 0.2);
                const modifier = stack.get(DataComponentTypes.ATTRIBUTE_MODIFIERS);
                if (modifier) modifier.value = 1.5;
            }
            break;
        }
        case Techs.VOID_DWELLER: {
            const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
            const stack = player.getItem(intoVoid);
            if (stack) {
                stack.set(DataComponentTypes.EFFECT_DURATION, stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 1) * 2);
                intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 1.4);
            }
            break;
        }
        case Techs.SPACE_TEAR: {
            const stack = player.getItem(Items.INTO_VOID_WEAPON);
            if (stack) stack.set(DataComponentTypes.EFFECT_RANGE, 128);
            break;
        }
        case Techs.EXPLOSIVE_ARMOR: {
            player.onDamageExplosionRadius *= 1.4;
            break;
        }
        case Techs.MELTDOWN: {
            const stack = player.getItem(Items.LASER_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 0);
                stack.set(DataComponentTypes.UI_COLOR, '#ff0000');
                const laser = Items.LASER_WEAPON as LaserWeapon;
                laser.setDrainRate(stack, laser.getDrainRate(stack) * 1.5);
            }
            break;
        }
        case Techs.MISSILE: {
            player.removeItem(Items.BOMB_WEAPON);
            player.addItem(Items.MISSILE_WEAPON);
            break;
        }
        case Techs.HONEYCOMB_MISSILE: {
            const stack = player.getItem(Items.MISSILE_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.MISSILE_COUNT, 24);
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 3);
                stack.set(DataComponentTypes.EXPLOSION_DAMAGE, 6);
                stack.set(DataComponentTypes.EXPLOSION_RADIUS, 48);
            }
            break;
        }
        case Techs.STEERING_GEAR: {
            player.steeringGear = true;
            break;
        }
        case Techs.FIRE_CONTROL_COMPUTER: {
            player.autoAim = new AutoAim(player);
            break;
        }
        case Techs.ROCKET_LAUNCHER: {
            player.addItem(Items.ROCKET_WEAPON);
            break;
        }
        case Techs.RANDOM_ROCKET: {
            const rocket = player.getItem(Items.ROCKET_WEAPON);
            if (rocket) {
                rocket.set(DataComponentTypes.MISSILE_RANDOM_ENABLE, true);
            }
            break;
        }
        case Techs.DECOY_RELEASER: {
            player.addItem(Items.DECOY_RELEASER);
            break;
        }
        case Techs.CIWS: {
            player.addItem(Items.CIWS_WEAPON);
            break;
        }
        case Techs.INSTANT_RESPONSE: {
            player.followPointer = true;
            break;
        }
    }
}