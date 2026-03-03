import {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";
import {PhaseLasers} from "../../item/weapon/PhaseLasers.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {IntoVoidWeapon} from "../../item/weapon/IntoVoidWeapon.ts";
import {AutoAim} from "./AutoAim.ts";
import {Items} from "../../item/Items.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {NovaFlightClient} from "../NovaFlightClient.ts";
import type {Tech} from "../../tech/Tech.ts";
import {Techs} from "../../tech/Techs.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {BallisticCalculator} from "./BallisticCalculator.ts";

export class ApplyClientTech {
    public static apply(tech: RegistryEntry<Tech>): void {
        const player = NovaFlightClient.getInstance().player;
        if (!player) return;

        switch (tech) {
            case Techs.ENERGY_FORCE:
                player.addItem(Items.EMP_WEAPON);
                break;
            case Techs.PHASE_LASERS:
                player.addItem(Items.PHASE_LASERS);
                break;
            case Techs.HIGH_EFFICIENCY_COOLANT: {
                const laser = Items.PHASE_LASERS as PhaseLasers;
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
                    const base = stack.getOrDefault(DataComponents.EFFECT_RANGE, 480);
                    stack.set(DataComponents.EFFECT_RANGE, base * 1.5);
                    emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
                }
                break;
            }
            case Techs.QUICK_CHARGE: {
                const emp = Items.EMP_WEAPON as EMPWeapon;
                const stack = player.getItem(emp);
                if (stack) {
                    const base = stack.getOrDefault(DataComponents.EFFECT_RANGE, 480);
                    stack.set(DataComponents.EFFECT_RANGE, base * 0.5);
                    emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 0.5);
                }
                break;
            }
            case Techs.HARMONIC_ANALYSIS: {
                const stack = player.getItem(Items.PHASE_LASERS);
                if (stack) {
                    stack.set(DataComponents.ATTACK_DAMAGE, 2);
                }
                break;
            }
            case Techs.HIGH_TEMPERATURE_ALLOY: {
                player.getInventory().values().forEach(stack => {
                    const base = stack.get(DataComponents.MAX_HEAT);
                    if (base) {
                        stack.set(DataComponents.MAX_HEAT, Math.ceil(base * 1.5));
                    }
                });
                break;
            }
            case Techs.MINI_GUN: {
                player.addItem(Items.MINIGUN_WEAPON);
                break;
            }
            case Techs.HD_BULLET:
                player.getInventory().values().forEach(stack => {
                    const item = stack.getItem();
                    if (item instanceof BaseWeapon) {
                        const base = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
                        stack.set(DataComponents.ATTACK_DAMAGE, Math.ceil(base * 2));
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
                    const base = c90.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
                    c90.set(DataComponents.ATTACK_DAMAGE, base * 2);
                }
                break;
            }
            case Techs.ARTILLERY125: {
                const c125 = new ItemStack(Items.ARTILLERY125);
                player.addItem(Items.ARTILLERY125, c125);

                if (player.getTechs().isUnlocked(Techs.HD_BULLET)) {
                    const base = c125.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
                    c125.set(DataComponents.ATTACK_DAMAGE, base * 2);
                }
                break;
            }
            case Techs.SENTINEL_POINT_DEFENSE: {
                player.addItem(Items.POINT_DEFENSE);
                break;
            }
            case Techs.FLAK_BATTERY: {
                player.addItem(Items.FLAK_BATTERY);
                break;
            }
            case Techs.HV_WARHEAD: {
                player.getInventory().values().forEach(stack => {
                    const base = stack.get(DataComponents.EXPLOSION_RADIUS);
                    if (base) {
                        stack.set(DataComponents.EXPLOSION_RADIUS, base * 1.5);
                    }
                });
                break;
            }
            case Techs.HD_EXPLOSIVES: {
                player.getInventory().values().forEach(stack => {
                    const base = stack.get(DataComponents.EXPLOSION_DAMAGE);
                    if (base) {
                        stack.set(DataComponents.EXPLOSION_DAMAGE, base * 1.4);
                    }
                });
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
                    stack.set(DataComponents.EFFECT_DURATION, stack.getOrDefault(DataComponents.EFFECT_DURATION, 1) * 0.1);
                    intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 0.2);
                    const modifier = stack.get(DataComponents.ATTRIBUTE_MODIFIERS);
                    if (modifier) modifier.value = 1.5;
                }
                break;
            }
            case Techs.VOID_DWELLER: {
                const intoVoid = Items.INTO_VOID_WEAPON as IntoVoidWeapon;
                const stack = player.getItem(intoVoid);
                if (stack) {
                    stack.set(DataComponents.EFFECT_DURATION, stack.getOrDefault(DataComponents.EFFECT_DURATION, 1) * 2);
                    intoVoid.setMaxCooldown(stack, intoVoid.accuratelyMaxCooldown(stack) * 1.4);
                }
                break;
            }
            case Techs.SPACE_TEAR: {
                const stack = player.getItem(Items.INTO_VOID_WEAPON);
                if (stack) stack.set(DataComponents.EFFECT_RANGE, 128);
                break;
            }
            case Techs.EXPLOSIVE_ARMOR: {
                player.onDamageExplosionRadius *= 1.4;
                break;
            }
            case Techs.GRAY: {
                const stack = player.getItem(Items.PHASE_LASERS);
                if (stack) {
                    stack.set(DataComponents.ATTACK_DAMAGE, 0);
                    stack.set(DataComponents.UI_COLOR, '#ff0000');
                    const laser = Items.PHASE_LASERS as PhaseLasers;
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
                    stack.set(DataComponents.LAUNCH_COUNT, 24);
                    stack.set(DataComponents.ATTACK_DAMAGE, 3);
                    stack.set(DataComponents.EXPLOSION_DAMAGE, 6);
                    stack.set(DataComponents.EXPLOSION_RADIUS, 48);
                }
                break;
            }
            case Techs.SPACE_TORPEDOES: {
                player.removeItem(Items.MISSILE_WEAPON);
                player.addItem(Items.SPACE_TORPEDOES);
                break;
            }
            case Techs.STEERING_GEAR: {
                player.steeringGear = true;
                break;
            }
            case Techs.BALLISTIC_CALCULATOR : {
                player.bc = new BallisticCalculator(player);
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
                    rocket.set(DataComponents.MISSILE_RANDOM_ENABLE, true);
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
            case Techs.CLOUD_LIGHTNING: {
                player.addItem(Items.CLOUD_LIGHTNING);
                break;
            }
            case Techs.ARC_EMITTER: {
                player.addItem(Items.ARC_EMITTER);
                break;
            }
            case Techs.FOCUSED_ARC_EMITTER: {
                player.addItem(Items.FOCUSED_ARC_EMITTER);
                break;
            }
            case Techs.GAMMA_LASERS: {
                player.addItem(Items.GAMMA_LASERS);
                break;
            }
            case Techs.PARTICLE_LANCE: {
                player.addItem(Items.PARTICLE_LANCE);
                break;
            }
            case Techs.TACHYON_LANCE: {
                player.removeItem(Items.PARTICLE_LANCE);
                player.addItem(Items.TACHYON_LANCE);
                break;
            }
            case Techs.COILGUNS : {
                player.addItem(Items.COILGUN);
                player.removeItem(Items.CANNON40_WEAPON);
                break;
            }
            case Techs.RAILGUNS: {
                player.addItem(Items.RAILGUN);
                player.removeItem(Items.COILGUN);
                break;
            }
            case Techs.KINETIC_ARTILLERY : {
                player.addItem(Items.KINETIC_ARTILLERY);
                break;
            }
            case Techs.PERDITION_BEAM: {
                player.removeItem(Items.PHASE_LASERS);
                player.addItem(Items.PERDITION_BEAM);
                break;
            }
        }
    }
}