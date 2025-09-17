import {EMPWeapon} from "../item/weapon/EMPWeapon.ts";
import {LaserWeapon} from "../item/weapon/LaserWeapon.ts";
import {BaseWeapon} from "../item/weapon/BaseWeapon/BaseWeapon.ts";
import {World} from "../world/World.ts";
import {IntoVoidWeapon} from "../item/weapon/IntoVoidWeapon.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {AutoAim} from "./AutoAim.ts";
import {Items} from "../item/items.ts";
import {ItemStack} from "../item/ItemStack.ts";
import {DataComponentTypes} from "../component/DataComponentTypes.ts";

export function applyTech(world: World, id: string) {
    const player = world.player;
    if (!player) return;
    switch (id) {
        case 'energy_focus':
            player.addWeapon(Items.EMP_WEAPON, new ItemStack(Items.EMP_WEAPON));
            break;
        case 'laser':
            player.addWeapon(Items.LASER_WEAPON, new ItemStack(Items.LASER_WEAPON));
            break;
        case 'high_efficiency_coolant': {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = player.weapons.get(laser);
            if (stack) {
                laser.setCoolRate(stack, laser.getCoolRate(stack) * 1.5);
            }
            break;
        }
        case 'ad_capacitance': {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.weapons.get(emp);
            if (stack) {
                emp.radius *= 1.5;
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
            }
            break;
        }
        case 'quick_charge': {
            const emp = Items.EMP_WEAPON as EMPWeapon;
            const stack = player.weapons.get(emp);
            if (stack) {
                emp.radius *= 0.5;
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 0.5);
            }
            break;
        }
        case 'harmonic_analysis': {
            const laser = Items.LASER_WEAPON;
            const stack = player.weapons.get(laser);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 2);
            }
            break;
        }
        case 'high_temperature_alloy': {
            const laser = Items.LASER_WEAPON as LaserWeapon;
            const stack = player.weapons.get(laser);
            if (stack) {
                laser.setMaxHeat(stack, laser.getMaxHeat(stack) * 1.5);
            }
            break;
        }
        case 'gunboat_focus':
            player.addWeapon(Items.MINIGUN_WEAPON, new ItemStack(Items.MINIGUN_WEAPON));
            break;
        case 'hd_bullet':
            player.weapons.values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) {
                    const base = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                    stack.set(DataComponentTypes.ATTACK_DAMAGE, base * 2);
                }
            });
            break;
        case 'ad_loading':
            player.weapons.values().forEach(stack => {
                const item = stack.getItem();
                if (item instanceof BaseWeapon) item.setFireRate(stack, item.getFireRate(stack) * 0.8);
            });
            break;
        case '90_cannon': {
            const c90 = new ItemStack(Items.CANNON90_WEAPON);
            player.addWeapon(Items.CANNON90_WEAPON, c90);
            if (player.techTree.isUnlocked('hd_bullet')) {
                const base = c90.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
                c90.set(DataComponentTypes.ATTACK_DAMAGE, base * 2);
            }
            break;
        }
        case 'hv_warhead': {
            const c90Stack = player.weapons.get(Items.CANNON90_WEAPON);
            if (c90Stack) {
                const base = c90Stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 1);
                c90Stack.set(DataComponentTypes.EXPLOSION_RADIUS, base * 1.5);
            }

            const bombStack = player.weapons.get(Items.BOMB_WEAPON);
            if (bombStack) {
                const base = bombStack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 1);
                bombStack.set(DataComponentTypes.EXPLOSION_RADIUS, base * 1.5);
            }
            break;
        }
        case 'hd_explosives': {
            const c90Stack = player.weapons.get(Items.CANNON90_WEAPON);
            if (c90Stack) {
                const base = c90Stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 1);
                c90Stack.set(DataComponentTypes.EXPLOSION_DAMAGE, base * 1.4);
            }
            const bombStack = player.weapons.get(Items.BOMB_WEAPON);
            if (bombStack) {
                const base = bombStack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 1);
                bombStack.set(DataComponentTypes.EXPLOSION_DAMAGE, base * 1.4);
            }
            break;
        }
        case 'ship_opt':
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 0), null);
            player.setHealth(player.getMaxHealth());
            break;
        case 'into_void':
            player.addWeapon(Items.INTO_VOID_WEAPON, new ItemStack(Items.INTO_VOID_WEAPON));
            break;
        case 'void_leap': {
            const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
            const stack = player.weapons.get(Items.INTO_VOID_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.EFFECT_DURATION, stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 1) * 0.1);
                intoVoid.setMaxCooldown(stack, intoVoid.trueMaxCooldown(stack) * 0.2);
                intoVoid.modifier.value = 1.5;
            }
            break;
        }
        case 'void_dweller': {
            const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
            const stack = player.weapons.get(Items.INTO_VOID_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.EFFECT_DURATION, stack.getOrDefault(DataComponentTypes.EFFECT_DURATION, 1) * 2);
                intoVoid.setMaxCooldown(stack, intoVoid.trueMaxCooldown(stack) * 1.4);
            }
            break;
        }
        case 'space_tear': {
            const stack = player.weapons.get(Items.INTO_VOID_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.VOID_DAMAGE_RANGE, 128);
            }
            break;
        }
        case 'explosive_armor':
            player.onDamageExplosionRadius *= 1.4;
            break;
        case 'meltdown': {
            const stack = player.weapons.get(Items.LASER_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 0);
                stack.set(DataComponentTypes.UI_COLOR, '#ff0000');
                const laser = Items.LASER_WEAPON as LaserWeapon;
                laser.setDrainRate(stack, laser.getDrainRate(stack) * 1.5);
            }
            break;
        }
        case 'missile': {
            player.weapons.delete(Items.BOMB_WEAPON);
            player.addWeapon(Items.MISSILE_WEAPON, new ItemStack(Items.MISSILE_WEAPON));
            player.addWeapon(Items.JAMMER_WEAPON, new ItemStack(Items.JAMMER_WEAPON));
            break;
        }
        case 'honeycomb_missile': {
            const stack = player.weapons.get(Items.MISSILE_WEAPON);
            if (stack) {
                stack.set(DataComponentTypes.MISSILE_COUNT, 24);
                stack.set(DataComponentTypes.ATTACK_DAMAGE, 3);
                stack.set(DataComponentTypes.EXPLOSION_DAMAGE, 6);
                stack.set(DataComponentTypes.EXPLOSION_RADIUS, 48);
            }
            break;
        }
        case 'steering_gear':
            player.steeringGear = true;
            break;
        case 'auto_aim':
            player.autoAim = new AutoAim(player);
            break;
        case 'rocket_launcher':
            player.addWeapon(Items.ROCKET_WEAPON, new ItemStack(Items.ROCKET_WEAPON));
            break;
        case 'random_rocket': {
            const rocket = player.weapons.get(Items.ROCKET_WEAPON);
            if (rocket) {
                rocket.set(DataComponentTypes.MISSILE_RANDOM_ENABLE, true);
            }
            break;
        }
    }
}