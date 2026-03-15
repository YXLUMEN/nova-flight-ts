import {Items} from "../../item/Items.ts";
import {EMPWeapon} from "../../item/weapon/EMPWeapon.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {ItemStack} from "../../item/ItemStack.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {IntoVoidWeapon} from "../../item/weapon/IntoVoidWeapon.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {Tech} from "../../tech/Tech.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {Techs} from "../../tech/Techs.ts";
import {BitFlag} from "../../utils/BitFlag.ts";
import {WeaponType} from "../../item/WeaponType.ts";

export class ApplyServerTech {
    public static apply(tech: RegistryEntry<Tech>, player: ServerPlayerEntity): void {
        switch (tech) {
            case Techs.ENERGY_FORCE:
                player.addItem(Items.EMP_WEAPON);
                break;
            case Techs.PHASE_LASERS:
                const stack = new ItemStack(Items.PHASE_LASERS);
                player.addItem(Items.PHASE_LASERS, stack);
                this.onEnergyWpn(stack, player);
                this.onHasHeatWpn(stack, player);
                break;
            case Techs.COILGUNS : {
                const stack = new ItemStack(Items.COILGUN);
                player.addItem(Items.COILGUN, stack);
                player.removeItem(Items.CANNON40_WEAPON);

                this.onUnlockBulletWpn(stack, player);
                break;
            }
            case Techs.RAILGUNS: {
                const stack = new ItemStack(Items.RAILGUN);
                player.addItem(Items.RAILGUN, stack);
                player.removeItem(Items.COILGUN);

                this.onUnlockBulletWpn(stack, player);
                break;
            }
            case Techs.KINETIC_ARTILLERY: {
                const stack = new ItemStack(Items.KINETIC_ARTILLERY);
                player.addItem(Items.KINETIC_ARTILLERY, stack);

                this.onUnlockBulletWpn(stack, player);
                break;
            }
            case Techs.CANNON90: {
                const stack = new ItemStack(Items.CANNON90_WEAPON);
                player.addItem(Items.CANNON90_WEAPON, stack);

                this.onUnlockBulletWpn(stack, player);
                this.onUnlockExplosionWpn(stack, player);
                break;
            }
            case Techs.ARTILLERY125: {
                const stack = new ItemStack(Items.ARTILLERY125);
                player.addItem(Items.ARTILLERY125, stack);

                this.onUnlockBulletWpn(stack, player)
                this.onUnlockExplosionWpn(stack, player);
                break;
            }
            case Techs.ROCKET_LAUNCHER: {
                const stack = new ItemStack(Items.ROCKET_WEAPON);
                player.addItem(Items.ROCKET_WEAPON, stack);

                this.onUnlockBulletWpn(stack, player);
                this.onUnlockExplosionWpn(stack, player);
                break;
            }
            case Techs.MINI_GUN: {
                const stack = new ItemStack(Items.MINIGUN_WEAPON);
                player.addItem(Items.MINIGUN_WEAPON, stack);

                this.onUnlockBulletWpn(stack, player);
                break;
            }
            case Techs.CIWS: {
                const stack = new ItemStack(Items.CIWS_WEAPON);
                player.addItem(Items.CIWS_WEAPON);

                this.onUnlockBulletWpn(stack, player);
                this.onHasHeatWpn(stack, player);
                break;
            }
            case Techs.CLOUD_LIGHTNING: {
                const stack = new ItemStack(Items.CLOUD_LIGHTNING);
                player.addItem(Items.CLOUD_LIGHTNING, stack);
                this.onEnergyWpn(stack, player);
                this.onArcWpn(stack, player);
                break;
            }
            case Techs.ARC_EMITTER: {
                const stack = new ItemStack(Items.ARC_EMITTER);
                player.addItem(Items.ARC_EMITTER, stack);
                this.onEnergyWpn(stack, player);
                this.onArcWpn(stack, player);
                break;
            }
            case Techs.FOCUSED_ARC_EMITTER: {
                const stack = new ItemStack(Items.FOCUSED_ARC_EMITTER);
                player.addItem(Items.FOCUSED_ARC_EMITTER, stack);
                this.onEnergyWpn(stack, player);
                this.onArcWpn(stack, player);
                break;
            }
            case Techs.GAMMA_LASERS: {
                const stack = new ItemStack(Items.GAMMA_LASERS);
                player.addItem(Items.GAMMA_LASERS, stack);
                this.onEnergyWpn(stack, player);
                break;
            }
            case Techs.PARTICLE_LANCE: {
                const stack = new ItemStack(Items.PARTICLE_LANCE);
                player.addItem(Items.PARTICLE_LANCE);
                this.onEnergyWpn(stack, player);
                break;
            }
            case Techs.TACHYON_LANCE: {
                player.removeItem(Items.PARTICLE_LANCE);

                const stack = new ItemStack(Items.TACHYON_LANCE);
                player.addItem(Items.TACHYON_LANCE);
                this.onEnergyWpn(stack, player);
                break;
            }
            case Techs.PERDITION_BEAM: {
                player.removeItem(Items.PHASE_LASERS);

                const stack = new ItemStack(Items.PERDITION_BEAM);
                player.addItem(Items.PERDITION_BEAM, stack);
                this.onEnergyWpn(stack, player);
                this.onHasHeatWpn(stack, player);
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
            case Techs.HIGH_EFFICIENCY_COOLANT: {
                player.getInventory().values().forEach(stack => {
                    const base = stack.get(DataComponents.COOLDOWN_RATE);
                    if (!base) return;
                    stack.set(DataComponents.COOLDOWN_RATE, base * 1.5);
                })
                break;
            }
            case Techs.AD_CAPACITANCE: {
                const emp = Items.EMP_WEAPON as EMPWeapon;
                const stack = player.getItem(emp);
                if (!stack) break;

                const base = stack.getOrDefault(DataComponents.EFFECT_RANGE, 480);
                stack.set(DataComponents.EFFECT_RANGE, base * 1.5);
                emp.setMaxCooldown(stack, emp.getMaxCooldown(stack) * 1.2);
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
                player.getInventory().values().forEach(stack => {
                    const type = stack.get(DataComponents.WEAPON_TYPE);
                    if (type === null || !BitFlag.has(type, WeaponType.ENERGY)) return;

                    const base = stack.get(DataComponents.ATTACK_DAMAGE);
                    if (!base) return;

                    stack.set(DataComponents.ATTACK_DAMAGE, base * 1.4);
                });
                break;
            }
            case Techs.HIGH_TEMPERATURE_ALLOY: {
                player.getInventory().values().forEach(stack => {
                    const base = stack.get(DataComponents.MAX_HEAT);
                    if (!base) return;
                    stack.set(DataComponents.MAX_HEAT, Math.ceil(base * 1.5));
                });
                break;
            }
            case Techs.HD_BULLET:
                player.getInventory().values().forEach(stack => {
                    const type = stack.get(DataComponents.WEAPON_TYPE);
                    if (type === null || !BitFlag.has(type, WeaponType.KINETIC)) return;

                    const base = stack.get(DataComponents.ATTACK_DAMAGE);
                    if (!base) return;
                    stack.set(DataComponents.ATTACK_DAMAGE, Math.ceil(base * 2));
                });
                break;
            case Techs.AD_LOADING: {
                player.getInventory().values().forEach(stack => {
                    const item = stack.getItem();
                    if (item instanceof BaseWeapon) item.setFireRate(stack, item.getFireRate(stack) * 0.8);
                });
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
                    const base = stack.get(DataComponents.EXPLOSION_POWER);
                    if (base) {
                        stack.set(DataComponents.EXPLOSION_POWER, base * 1.4);
                    }
                });
                break;
            }
            case Techs.SHIP_OPT: {
                player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 3), null);

                if (player.getTags().has('Repaired')) return;
                player.addTag('Repaired');
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
            case Techs.MISSILE: {
                player.removeItem(Items.BOMB_WEAPON);

                const missile = new ItemStack(Items.MISSILE_WEAPON);
                player.addItem(Items.MISSILE_WEAPON, missile);
                this.onUnlockExplosionWpn(missile, player);
                break;
            }
            case Techs.HONEYCOMB_MISSILE: {
                const stack = player.getItem(Items.MISSILE_WEAPON);
                if (stack) {
                    stack.set(DataComponents.LAUNCH_COUNT, 24);
                    stack.set(DataComponents.ATTACK_DAMAGE, 3);
                    stack.set(DataComponents.EXPLOSION_POWER, 6);
                    stack.set(DataComponents.EXPLOSION_RADIUS, 48);
                }
                break;
            }
            case Techs.SPACE_TORPEDOES: {
                player.removeItem(Items.MISSILE_WEAPON);

                const stack = new ItemStack(Items.SPACE_TORPEDOES);
                player.addItem(Items.SPACE_TORPEDOES, stack);

                this.onUnlockBulletWpn(stack, player);
                this.onUnlockExplosionWpn(stack, player);
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
            case Techs.BARRIER_POINT_DEFENSE: {
                const stack = player.getItem(Items.POINT_DEFENSE);
                if (stack) {
                    stack.set(DataComponents.MAX_DEFENSE, 3);
                    stack.set(DataComponents.ATTACK_DAMAGE, 2);
                }
                break;
            }
            case Techs.GUARDIAN_POINT_DEFENSE: {
                const stack = player.getItem(Items.POINT_DEFENSE);
                if (stack) {
                    stack.set(DataComponents.MAX_DEFENSE, 5);
                    stack.set(DataComponents.ATTACK_DAMAGE, 3);
                }
                break;
            }
            case Techs.FLAK_CANNONS: {
                const stack = player.getItem(Items.FLAK_BATTERY);
                if (stack) {
                    stack.set(DataComponents.MAX_DEFENSE, 2);
                    stack.set(DataComponents.ATTACK_DAMAGE, 2);
                }
                break;
            }
            case Techs.FLAK_ARTILLERY: {
                const stack = player.getItem(Items.FLAK_BATTERY);
                if (stack) {
                    stack.set(DataComponents.MAX_DEFENSE, 3);
                    stack.set(DataComponents.ATTACK_DAMAGE, 3);
                }
                break;
            }
            case Techs.CORONA_DISCHARGE: {
                player.getInventory().forEach(stack => {
                    const type = stack.get(DataComponents.WEAPON_TYPE);
                    if (type === null || !BitFlag.has(type, WeaponType.ARC)) return;

                    const base = stack.get(DataComponents.ATTACK_RANGE);
                    if (!base) return;
                    stack.set(DataComponents.ATTACK_RANGE, Math.ceil(base * 1.2));
                })
                break;
            }
        }
    }

    private static onUnlockBulletWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HD_BULLET)) {
            const base = stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
            stack.set(DataComponents.ATTACK_DAMAGE, base * 2);

            player.syncStack(stack);
        }

        if (tech.isUnlocked(Techs.AD_LOADING)) {
            const item = stack.getItem();
            if (item instanceof BaseWeapon) {
                if (item.getFireRate(stack) <= 1) return;

                item.setFireRate(stack, item.getFireRate(stack) * 0.8);
                player.syncStack(stack);
            }
        }
    }

    private static onUnlockExplosionWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HV_WARHEAD)) {
            const base = stack.get(DataComponents.EXPLOSION_RADIUS);
            if (base) {
                stack.set(DataComponents.EXPLOSION_RADIUS, base * 1.5);
                player.syncStack(stack);
            }
        }

        if (tech.isUnlocked(Techs.HD_EXPLOSIVES)) {
            const base = stack.get(DataComponents.EXPLOSION_POWER);
            if (base) {
                stack.set(DataComponents.EXPLOSION_POWER, base * 1.4);
                player.syncStack(stack);
            }
        }
    }

    private static onEnergyWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HARMONIC_ANALYSIS)) {
            const base = stack.get(DataComponents.ATTACK_DAMAGE);
            if (base) {
                stack.set(DataComponents.ATTACK_DAMAGE, base * 1.4);
            }
        }
    }

    private static onArcWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.CORONA_DISCHARGE)) {
            const base = stack.get(DataComponents.ATTACK_RANGE);
            if (base) {
                stack.set(DataComponents.ATTACK_RANGE, Math.ceil(base * 1.2));
            }
        }
    }

    private static onHasHeatWpn(stack: ItemStack, player: ServerPlayerEntity) {
        const tech = player.getTechs();

        if (tech.isUnlocked(Techs.HIGH_TEMPERATURE_ALLOY)) {
            const base = stack.get(DataComponents.MAX_HEAT);
            if (base) {
                stack.set(DataComponents.MAX_HEAT, Math.ceil(base * 1.5));
            }
        }
    }
}

