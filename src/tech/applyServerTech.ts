import {Items} from "../item/Items.ts";
import {LaserWeapon} from "../item/weapon/LaserWeapon.ts";
import {EMPWeapon} from "../item/weapon/EMPWeapon.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";
import {BaseWeapon} from "../item/weapon/BaseWeapon/BaseWeapon.ts";
import {ItemStack} from "../item/ItemStack.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {IntoVoidWeapon} from "../item/weapon/IntoVoidWeapon.ts";
import type {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";

export function applyServerTech(id: string, player: ServerPlayerEntity): void {
    switch (id) {
        case 'energy_focus':
            player.addItem(Items.EMP_WEAPON);
            break;
        case 'laser':
            player.addItem(Items.LASER_WEAPON);
            break;
        case 'high_efficiency_coolant': {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = player.getItem(laser);
            if (stack) {
                laser.setCoolRate(stack, laser.getCoolRate(stack) * 1.5);
            }
            break;
        }
        case 'ad_capacitance': {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.getItem(emp);
            if (stack) {
                const base = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);
                stack.set(DataComponentTypes.EFFECT_RANGE, base * 1.5);
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
            }
            break;
        }
        case 'quick_charge': {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.getItem(emp);
            if (stack) {
                const base = stack.getOrDefault(DataComponentTypes.EFFECT_RANGE, 480);
                stack.set(DataComponentTypes.EFFECT_RANGE, base * 0.5);
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 0.5);
            }
            break;
        }
        case 'harmonic_analysis': {
            const stack = player.getItem(Items.LASER_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 2);
            }
            break;
        }
        case 'high_temperature_alloy': {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.MAX_HEAT);
                if (base) {
                    stack.set(DataComponentTypes.MAX_HEAT, Math.ceil(base * 1.5));
                }
            });
            break;
        }
        case 'gunboat_focus': {
            player.addItem(Items.MINIGUN_WEAPON);
            break;
        }
        case 'hd_bullet':
            player.getInventory().values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) {
                    const base = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                    stack.set(DataComponentTypes.ATTACK_DAMAGE, Math.ceil(base * 2));
                }
            });
            break;
        case 'ad_loading': {
            player.getInventory().values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) item.setFireRate(stack, item.getFireRate(stack) * 0.8);
            });
            break;
        }
        case '90_cannon': {
            const c90 = new ItemStack(Items.CANNON90_WEAPON);
            player.addItem(Items.CANNON90_WEAPON, c90);

            if (player.getTechs().isUnlocked('hd_bullet')) {
                const base = c90.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                c90.set(DataComponentTypes.ATTACK_DAMAGE, base * 2);
            }
            break;
        }
        case 'hv_warhead': {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.EXPLOSION_RADIUS);
                if (base) {
                    stack.set(DataComponentTypes.EXPLOSION_RADIUS, base * 1.5);
                }
            });
            break;
        }
        case 'hd_explosives': {
            player.getInventory().values().forEach(stack => {
                const base = stack.get(DataComponentTypes.EXPLOSION_DAMAGE);
                if (base) {
                    stack.set(DataComponentTypes.EXPLOSION_DAMAGE, base * 1.4);
                }
            });
            break;
        }
        case 'ship_opt': {
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 0), null);

            if (player.getNormalTags().has('Repaired')) return;
            player.addNormalTag('Repaired');
            player.setHealth(player.getMaxHealth());
            break;
        }
        case 'into_void': {
            player.addItem(Items.INTO_VOID_WEAPON);
            break;
        }
        case 'void_leap': {
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
        case 'void_dweller': {
            const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
            const stack = player.getItem(intoVoid);
            if (stack) {
                stack.set(DataComponentTypes.EFFECT_DURATION, stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 1) * 2);
                intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 1.4);
            }
            break;
        }
        case 'space_tear': {
            const stack = player.getItem(Items.INTO_VOID_WEAPON);
            if (stack) stack.set(DataComponentTypes.EFFECT_RANGE, 128);
            break;
        }
        case 'explosive_armor': {
            player.onDamageExplosionRadius *= 1.4;
            break;
        }
        case 'meltdown': {
            const stack = player.getItem(Items.LASER_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 0);
                stack.set(DataComponentTypes.UI_COLOR, '#ff0000');
                const laser = Items.LASER_WEAPON as LaserWeapon;
                laser.setDrainRate(stack, laser.getDrainRate(stack) * 1.5);
            }
            break;
        }
        case 'missile': {
            player.removeItem(Items.BOMB_WEAPON);
            player.addItem(Items.MISSILE_WEAPON);
            break;
        }
        case 'honeycomb_missile': {
            const stack = player.getItem(Items.MISSILE_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.MISSILE_COUNT, 24);
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 3);
                stack.set(DataComponentTypes.EXPLOSION_DAMAGE, 6);
                stack.set(DataComponentTypes.EXPLOSION_RADIUS, 48);
            }
            break;
        }
        case 'rocket_launcher': {
            player.addItem(Items.ROCKET_WEAPON);
            break;
        }
        case 'random_rocket': {
            const rocket = player.getItem(Items.ROCKET_WEAPON);
            if (rocket) {
                rocket.set(DataComponentTypes.MISSILE_RANDOM_ENABLE, true);
            }
            break;
        }
        case 'decoy_releaser': {
            player.addItem(Items.DECOY_RELEASER);
            break;
        }
        case 'ciws': {
            player.addItem(Items.CIWS_WEAPON);
            break;
        }
        case 'void_edge' : {
            player.voidEdge = true;
            break;
        }
    }
}