import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {ApplyTech} from "./ApplyTech.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {isDev} from "../../configs/RuntimeConfig.ts";
import {Items} from "../../item/Items.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {TechGiveItem} from "./apply/TechGiveItem.ts";
import {TechAdCapacitance} from "./apply/TechAdCapacitance.ts";
import {TechBarrierPointDefense} from "./apply/TechBarrierPointDefense.ts";
import {TechCoronaDischarge} from "./apply/TechCoronaDischarge.ts";
import {TechFlakArtillery} from "./apply/TechFlakArtillery.ts";
import {TechGuardianPointDefense} from "./apply/TechGuardianPointDefense.ts";
import {TechHarmonicAnalysis} from "./apply/TechHarmonicAnalysis.ts";
import {TechHdBullet} from "./apply/TechHdBullet.ts";
import {TechHdExplosives} from "./apply/TechHdExplosives.ts";
import {TechHighTemperatureAlloy} from "./apply/TechHighTemperatureAlloy.ts";
import {TechHighEfficiencyCoolant} from "./apply/TechHighEfficiencyCoolant.ts";
import {TechHoneycombMissile} from "./apply/TechHoneycombMissile.ts";
import {TechHvWarhead} from "./apply/TechHvWarhead.ts";
import {TechQuickCharge} from "./apply/TechQuickCharge.ts";
import {TechRandomRocket} from "./apply/TechRandomRocket.ts";
import {TechShipOpt} from "./apply/TechShipOpt.ts";
import {TechSpaceTear} from "./apply/TechSpaceTear.ts";
import {TechVoidDweller} from "./apply/TechVoidDweller.ts";
import {TechVoidLeap} from "./apply/TechVoidLeap.ts";
import {TechFlakCannons} from "./apply/TechFlakCannons.ts";
import {TechDeflector} from "./apply/TechDeflector.ts";

export class ServerTechManager {
    private static readonly techMap: Map<RegistryEntry<Tech>, ApplyTech> = new Map();

    public static apply(tech: RegistryEntry<Tech>, player: ServerPlayerEntity): void {
        if (isDev && !this.techMap.has(tech)) console.warn('Can not apply: ', tech);
        this.techMap.get(tech)?.apply(player);
    }

    public static remove(tech: RegistryEntry<Tech>, player: ServerPlayerEntity): void {
        if (isDev && !this.techMap.has(tech)) console.warn('Can not remove: ', tech);
        this.techMap.get(tech)?.remove(player);
    }

    public static get(tech: RegistryEntry<Tech>): ApplyTech | undefined {
        return this.techMap.get(tech);
    }

    private static add<T extends ApplyTech, U extends unknown[]>(
        tech: RegistryEntry<Tech>,
        apply: new (...args: U) => T,
        ...args: U
    ): void {
        if (this.techMap.has(tech)) throw new Error(`TechApply ${tech} already registered.`);
        this.techMap.set(tech, new apply(...args));
    }

    public static init(): void {
        this.add(Techs.AD_CAPACITANCE, TechAdCapacitance);
        this.add(Techs.ARC_EMITTER, TechGiveItem, Items.ARC_EMITTER);
        this.add(Techs.ARTILLERY125, TechGiveItem, Items.ARTILLERY125);
        this.add(Techs.AUTOCANNON, TechGiveItem, Items.MINIGUN);
        this.add(Techs.BARRIER_POINT_DEFENSE, TechBarrierPointDefense);
        this.add(Techs.CANNON90, TechGiveItem, Items.CANNON90);
        this.add(Techs.CIWS, TechGiveItem, Items.CIWS);
        this.add(Techs.CLOUD_LIGHTNING, TechGiveItem, Items.CLOUD_LIGHTNING);
        this.add(Techs.COILGUNS, TechGiveItem, Items.COILGUN);
        this.add(Techs.CORONA_DISCHARGE, TechCoronaDischarge);
        this.add(Techs.DECOY_RELEASER, TechGiveItem, Items.DECOY_RELEASER);
        this.add(Techs.ENERGY_FORCE, TechGiveItem, Items.EMP_WEAPON);
        this.add(Techs.FLAK_ARTILLERY, TechFlakArtillery);
        this.add(Techs.FLAK_BATTERY, TechGiveItem, Items.FLAK_BATTERY, false);
        this.add(Techs.FLAK_CANNONS, TechFlakCannons);
        this.add(Techs.FOCUSED_ARC_EMITTER, TechGiveItem, Items.FOCUSED_ARC_EMITTER);
        this.add(Techs.GAMMA_LASERS, TechGiveItem, Items.GAMMA_LASERS);
        this.add(Techs.GUARDIAN_POINT_DEFENSE, TechGuardianPointDefense);
        this.add(Techs.HARMONIC_ANALYSIS, TechHarmonicAnalysis);
        this.add(Techs.HD_BULLET, TechHdBullet);
        this.add(Techs.HD_EXPLOSIVES, TechHdExplosives);
        this.add(Techs.HIGH_EFFICIENCY_COOLANT, TechHighEfficiencyCoolant);
        this.add(Techs.HIGH_TEMPERATURE_ALLOY, TechHighTemperatureAlloy);
        this.add(Techs.HONEYCOMB_MISSILE, TechHoneycombMissile);
        this.add(Techs.HV_WARHEAD, TechHvWarhead);
        this.add(Techs.KINETIC_ARTILLERY, TechGiveItem, Items.KINETIC_ARTILLERY);
        this.add(Techs.MISSILE, TechGiveItem, Items.MISSILE_WEAPON);
        this.add(Techs.PERDITION_BEAM, TechGiveItem, Items.PERDITION_BEAM);
        this.add(Techs.PARTICLE_LANCE, TechGiveItem, Items.PARTICLE_LANCE);
        this.add(Techs.PHASE_LASERS, TechGiveItem, Items.PHASE_LASERS);
        this.add(Techs.QUICK_CHARGE, TechQuickCharge);
        this.add(Techs.RAILGUNS, TechGiveItem, Items.RAILGUN);
        this.add(Techs.ROCKET_LAUNCHER, TechGiveItem, Items.ROCKET_LAUNCHER);
        this.add(Techs.RANDOM_ROCKET, TechRandomRocket);
        this.add(Techs.SENTINEL_POINT_DEFENSE, TechGiveItem, Items.POINT_DEFENSE);
        this.add(Techs.SHIP_OPT, TechShipOpt);
        this.add(Techs.SPACE_TEAR, TechSpaceTear);
        this.add(Techs.SPACE_TORPEDOES, TechGiveItem, Items.SPACE_TORPEDOES);
        this.add(Techs.STORM_FIRE, TechGiveItem, Items.STORM_FIRE);
        this.add(Techs.TACHYON_LANCE, TechGiveItem, Items.TACHYON_LANCE);
        this.add(Techs.VOID_DWELLER, TechVoidDweller);
        this.add(Techs.VOID_ENGIN, TechGiveItem, Items.VOID_ENGIN);
        this.add(Techs.VOID_LEAP, TechVoidLeap);
        this.add(Techs.DEFLECTOR, TechDeflector);
        this.add(Techs.ION_DISRUPTOR, TechGiveItem, Items.ION_DISRUPTOR);
    }
}