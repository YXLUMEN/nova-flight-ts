import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {Tech} from "./Tech.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {TechState} from "./TechState.ts";
import tech from "../tech/tech-data.json";

export class Techs {
    public static ENERGY_FORCE;
    public static ELECTRICAL_SURGES;
    public static AD_CAPACITANCE;
    public static ELE_OSCILLATION;
    public static QUICK_CHARGE;
    public static ELE_SHIELD;
    public static LASER;
    public static HIGH_EFFICIENCY_COOLANT;
    public static HARMONIC_ANALYSIS;
    public static HIGH_TEMPERATURE_ALLOY;
    public static ENERGY_RECOVERY;
    public static GUNBOAT_FOCUS;
    public static CIWS;
    public static HD_BULLET;
    public static AD_LOADING;
    public static APFS_DISCARDING_SABOT;
    public static CANNON90;
    public static HV_WARHEAD;
    public static HD_EXPLOSIVES;
    public static SERIAL_WARHEAD;
    public static HEAVY_WEAPON;
    public static ROCKET_LAUNCHER;
    public static RANDOM_ROCKET;
    public static INTO_VOID;
    public static VOID_DISTURBANCE;
    public static SPACE_TEAR;
    public static VOID_DWELLER;
    public static VOID_ENERGY_EXTRACTION;
    public static VOID_LEAP;
    public static SHIP_OPT;
    public static EXPLOSIVE_ARMOR;
    public static EMERGENCY_REPAIR;
    public static DECOY_RELEASER;
    public static INCENDIARY_BULLET;
    public static MELTDOWN;
    public static MISSILE;
    public static HONEYCOMB_MISSILE;
    public static STEERING_GEAR;
    public static FIRE_CONTROL_COMPUTER;
    public static INSTANT_RESPONSE;

    static {
        const parsed = TechState.normalizeTechs(tech);
        const registerFromJson = (name: string) => {
            return this.register(name, parsed.get(name)!);
        }

        this.ENERGY_FORCE = registerFromJson('energy_focus');
        this.ELECTRICAL_SURGES = registerFromJson('electrical_energy_surges');
        this.AD_CAPACITANCE = registerFromJson('ad_capacitance');
        this.ELE_OSCILLATION = registerFromJson('ele_oscillation');
        this.QUICK_CHARGE = registerFromJson('quick_charge');
        this.ELE_SHIELD = registerFromJson('ele_shield');
        this.LASER = registerFromJson('laser');
        this.HIGH_EFFICIENCY_COOLANT = registerFromJson('high_efficiency_coolant');
        this.HARMONIC_ANALYSIS = registerFromJson('harmonic_analysis');
        this.HIGH_TEMPERATURE_ALLOY = registerFromJson('high_temperature_alloy');
        this.ENERGY_RECOVERY = registerFromJson('energy_recovery');
        this.GUNBOAT_FOCUS = registerFromJson('gunboat_focus');
        this.CIWS = registerFromJson('ciws');
        this.HD_BULLET = registerFromJson('hd_bullet');
        this.AD_LOADING = registerFromJson('ad_loading');
        this.APFS_DISCARDING_SABOT = registerFromJson('apfs_discarding_sabot');
        this.CANNON90 = registerFromJson('90_cannon');
        this.HV_WARHEAD = registerFromJson('hv_warhead');
        this.HD_EXPLOSIVES = registerFromJson('hd_explosives');
        this.SERIAL_WARHEAD = registerFromJson('serial_warhead');
        this.HEAVY_WEAPON = registerFromJson('heavy_weapon');
        this.ROCKET_LAUNCHER = registerFromJson('rocket_launcher');
        this.RANDOM_ROCKET = registerFromJson('random_rocket');
        this.INTO_VOID = registerFromJson('into_void');
        this.VOID_DISTURBANCE = registerFromJson('void_disturbance');
        this.SPACE_TEAR = registerFromJson('space_tear');
        this.VOID_DWELLER = registerFromJson('void_dweller');
        this.VOID_ENERGY_EXTRACTION = registerFromJson('void_energy_extraction');
        this.VOID_LEAP = registerFromJson('void_leap');
        this.SHIP_OPT = registerFromJson('ship_opt');
        this.EXPLOSIVE_ARMOR = registerFromJson('explosive_armor');
        this.EMERGENCY_REPAIR = registerFromJson('emergency_repair');
        this.DECOY_RELEASER = registerFromJson('decoy_releaser');
        this.INCENDIARY_BULLET = registerFromJson('incendiary_bullet');
        this.MELTDOWN = registerFromJson('meltdown');
        this.MISSILE = registerFromJson('missile');
        this.HONEYCOMB_MISSILE = registerFromJson('honeycomb_missile');
        this.STEERING_GEAR = registerFromJson('steering_gear');
        this.FIRE_CONTROL_COMPUTER = registerFromJson('fire_control_computer');
        this.INSTANT_RESPONSE = registerFromJson('instant_response');

        Registries.TECH.getEntries().forEach(entry => entry.getValue().complete());
    }

    public static register(name: string, builder: InstanceType<typeof Tech.Builder>): RegistryEntry<Tech> {
        return Registry.registerReferenceById(Registries.TECH, Identifier.ofVanilla(name), builder.build());
    }
}