import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Tech} from "../../world/tech/Tech.ts";
import type {ApplyTech} from "../../world/tech/ApplyTech.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {Techs} from "../../world/tech/Techs.ts";
import type {Constructor} from "../../type/types.ts";
import {TechAdCapacitance} from "../../world/tech/apply/TechAdCapacitance.ts";
import {TechArcEmitter} from "../../world/tech/apply/TechArcEmitter.ts";
import {TechArtillery125} from "../../world/tech/apply/TechArtillery125.ts";
import {TechAutocannon} from "../../world/tech/apply/TechAutocannon.ts";
import {TechBarrierPointDefense} from "../../world/tech/apply/TechBarrierPointDefense.ts";
import {TechCannon90} from "../../world/tech/apply/TechCannon90.ts";
import {TechCiws} from "../../world/tech/apply/TechCiws.ts";
import {TechCloudLightning} from "../../world/tech/apply/TechCloudLightning.ts";
import {TechCoilguns} from "../../world/tech/apply/TechCoilguns.ts";
import {TechCoronaDischarge} from "../../world/tech/apply/TechCoronaDischarge.ts";
import {TechDecoyReleaser} from "../../world/tech/apply/TechDecoyReleaser.ts";
import {TechEnergyForce} from "../../world/tech/apply/TechEnergyForce.ts";
import {TechExplosiveArmor} from "../../world/tech/apply/TechExplosiveArmor.ts";
import {TechFlakArtillery} from "../../world/tech/apply/TechFlakArtillery.ts";
import {TechFlakBattery} from "../../world/tech/apply/TechFlakBattery.ts";
import {TechFocusedArcEmitter} from "../../world/tech/apply/TechFocusedArcEmitter.ts";
import {TechGammaLasers} from "../../world/tech/apply/TechGammaLasers.ts";
import {TechGuardianPointDefense} from "../../world/tech/apply/TechGuardianPointDefense.ts";
import {TechHarmonicAnalysis} from "../../world/tech/apply/TechHarmonicAnalysis.ts";
import {TechHdBullet} from "../../world/tech/apply/TechHdBullet.ts";
import {TechHdExplosives} from "../../world/tech/apply/TechHdExplosives.ts";
import {TechHighTemperatureAlloy} from "../../world/tech/apply/TechHighTemperatureAlloy.ts";
import {TechHighEfficiencyCoolant} from "../../world/tech/apply/TechHighEfficiencyCoolant.ts";
import {TechHoneycombMissile} from "../../world/tech/apply/TechHoneycombMissile.ts";
import {TechHvWarhead} from "../../world/tech/apply/TechHvWarhead.ts";
import {TechKineticArtillery} from "../../world/tech/apply/TechKineticArtillery.ts";
import {TechMissile} from "../../world/tech/apply/TechMissile.ts";
import {TechParticleLance} from "../../world/tech/apply/TechParticleLance.ts";
import {TechPhaseLasers} from "../../world/tech/apply/TechPhaseLasers.ts";
import {TechQuickCharge} from "../../world/tech/apply/TechQuickCharge.ts";
import {TechRailGuns} from "../../world/tech/apply/TechRailGuns.ts";
import {TechRandomRocket} from "../../world/tech/apply/TechRandomRocket.ts";
import {TechSentinelPointDefense} from "../../world/tech/apply/TechSentinelPointDefense.ts";
import {TechShipOpt} from "../../world/tech/apply/TechShipOpt.ts";
import {TechSpaceTear} from "../../world/tech/apply/TechSpaceTear.ts";
import {TechSpaceTorpedoes} from "../../world/tech/apply/TechSpaceTorpedoes.ts";
import {TechStormFire} from "../../world/tech/apply/TechStormFire.ts";
import {TechTachyonLance} from "../../world/tech/apply/TechTachyonLance.ts";
import {TechVoidDweller} from "../../world/tech/apply/TechVoidDweller.ts";
import {TechVoidEngin} from "../../world/tech/apply/TechVoidEngin.ts";
import {TechVoidLeap} from "../../world/tech/apply/TechVoidLeap.ts";
import {TechFlakCannons} from "../../world/tech/apply/TechFlakCannons.ts";
import {TechRocketLauncher} from "../../world/tech/apply/TechRocketLauncher.ts";
import {TechPerditionBeam} from "../../world/tech/apply/TechPerditionBeam.ts";
import {TechAdLoading} from "../../world/tech/apply/TechAdLoading.ts";
import {TechDeflector} from "../../world/tech/apply/TechDeflector.ts";
import {TechSmokeLauncher} from "../../world/tech/apply/TechSmokeLauncher.ts";

export class ServerTechManager {
    private static readonly techMap: Map<RegistryEntry<Tech>, ApplyTech> = new Map();

    public static apply(tech: RegistryEntry<Tech>, player: ServerPlayerEntity): void {
        this.techMap.get(tech)?.apply(player);
    }

    public static remove(tech: RegistryEntry<Tech>, player: ServerPlayerEntity): void {
        this.techMap.get(tech)?.remove(player);
    }

    public static get(tech: RegistryEntry<Tech>): ApplyTech | undefined {
        return this.techMap.get(tech);
    }

    private static register(tech: RegistryEntry<Tech>, apply: Constructor<ApplyTech>): void {
        if (this.techMap.has(tech)) throw new Error(`TechApply ${tech} already registered.`);
        this.techMap.set(tech, new apply());
    }

    public static init(): void {
        this.register(Techs.AD_CAPACITANCE, TechAdCapacitance);
        this.register(Techs.AD_LOADING, TechAdLoading);
        this.register(Techs.ARC_EMITTER, TechArcEmitter);
        this.register(Techs.ARTILLERY125, TechArtillery125);
        this.register(Techs.AUTOCANNON, TechAutocannon);
        this.register(Techs.BARRIER_POINT_DEFENSE, TechBarrierPointDefense);
        this.register(Techs.CANNON90, TechCannon90);
        this.register(Techs.CIWS, TechCiws);
        this.register(Techs.CLOUD_LIGHTNING, TechCloudLightning);
        this.register(Techs.COILGUNS, TechCoilguns);
        this.register(Techs.CORONA_DISCHARGE, TechCoronaDischarge);
        this.register(Techs.DECOY_RELEASER, TechDecoyReleaser);
        this.register(Techs.ENERGY_FORCE, TechEnergyForce);
        this.register(Techs.EXPLOSIVE_ARMOR, TechExplosiveArmor);
        this.register(Techs.FLAK_ARTILLERY, TechFlakArtillery);
        this.register(Techs.FLAK_BATTERY, TechFlakBattery);
        this.register(Techs.FLAK_CANNONS, TechFlakCannons);
        this.register(Techs.FOCUSED_ARC_EMITTER, TechFocusedArcEmitter);
        this.register(Techs.GAMMA_LASERS, TechGammaLasers);
        this.register(Techs.GUARDIAN_POINT_DEFENSE, TechGuardianPointDefense);
        this.register(Techs.HARMONIC_ANALYSIS, TechHarmonicAnalysis);
        this.register(Techs.HD_BULLET, TechHdBullet);
        this.register(Techs.HD_EXPLOSIVES, TechHdExplosives);
        this.register(Techs.HIGH_EFFICIENCY_COOLANT, TechHighEfficiencyCoolant);
        this.register(Techs.HIGH_TEMPERATURE_ALLOY, TechHighTemperatureAlloy);
        this.register(Techs.HONEYCOMB_MISSILE, TechHoneycombMissile);
        this.register(Techs.HV_WARHEAD, TechHvWarhead);
        this.register(Techs.KINETIC_ARTILLERY, TechKineticArtillery);
        this.register(Techs.MISSILE, TechMissile);
        this.register(Techs.PERDITION_BEAM, TechPerditionBeam);
        this.register(Techs.PARTICLE_LANCE, TechParticleLance);
        this.register(Techs.PHASE_LASERS, TechPhaseLasers);
        this.register(Techs.QUICK_CHARGE, TechQuickCharge);
        this.register(Techs.RAILGUNS, TechRailGuns);
        this.register(Techs.ROCKET_LAUNCHER, TechRocketLauncher);
        this.register(Techs.RANDOM_ROCKET, TechRandomRocket);
        this.register(Techs.SENTINEL_POINT_DEFENSE, TechSentinelPointDefense);
        this.register(Techs.SHIP_OPT, TechShipOpt);
        this.register(Techs.SPACE_TEAR, TechSpaceTear);
        this.register(Techs.SPACE_TORPEDOES, TechSpaceTorpedoes);
        this.register(Techs.STORM_FIRE, TechStormFire);
        this.register(Techs.TACHYON_LANCE, TechTachyonLance);
        this.register(Techs.VOID_DWELLER, TechVoidDweller);
        this.register(Techs.VOID_ENGIN, TechVoidEngin);
        this.register(Techs.VOID_LEAP, TechVoidLeap);
        this.register(Techs.DEFLECTOR, TechDeflector);
        this.register(Techs.SMOKE_LAUNCHER, TechSmokeLauncher);
    }
}