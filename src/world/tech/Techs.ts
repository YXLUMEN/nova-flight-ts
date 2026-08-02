import {Registry} from "../../registry/Registry.ts";
import {Registries} from "../../registry/Registries.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {Tech} from "./Tech.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {TechState} from "./TechState.ts";
import {isServer} from "../../configs/GlobalConfig.ts";

export class Techs {
    public static COILGUNS: RegistryEntry<Tech>;
    public static RAILGUNS: RegistryEntry<Tech>;
    public static KINETIC_ARTILLERY: RegistryEntry<Tech>;

    public static AUTOCANNON: RegistryEntry<Tech>;
    public static STORM_FIRE: RegistryEntry<Tech>;
    public static CIWS: RegistryEntry<Tech>;

    // 爆炸类
    public static EXPLOSIVE: RegistryEntry<Tech>;

    public static CANNON90: RegistryEntry<Tech>;
    public static ARTILLERY125: RegistryEntry<Tech>;

    public static MISSILE: RegistryEntry<Tech>;
    public static HONEYCOMB_MISSILE: RegistryEntry<Tech>;
    public static SPACE_TORPEDOES: RegistryEntry<Tech>;

    // 能量类
    public static LASER: RegistryEntry<Tech>;
    public static GAMMA_LASERS: RegistryEntry<Tech>;
    public static PHASE_LASERS: RegistryEntry<Tech>;

    // 重型武器
    public static HEAVY_WEAPON: RegistryEntry<Tech>;

    public static ROCKET_LAUNCHER: RegistryEntry<Tech>;
    public static RANDOM_ROCKET: RegistryEntry<Tech>;

    public static CLOUD_LIGHTNING: RegistryEntry<Tech>;
    public static ARC_EMITTER: RegistryEntry<Tech>;
    public static FOCUSED_ARC_EMITTER: RegistryEntry<Tech>;

    public static PARTICLE_LANCE: RegistryEntry<Tech>;
    public static TACHYON_LANCE: RegistryEntry<Tech>;
    public static PERDITION_BEAM: RegistryEntry<Tech>;

    // 炮艇专精
    public static GUNBOAT_FOCUS: RegistryEntry<Tech>;

    public static HD_BULLET: RegistryEntry<Tech>;
    public static AD_LOADING: RegistryEntry<Tech>;
    public static ANTIMATTER_WARHEAD: RegistryEntry<Tech>;

    public static HV_WARHEAD: RegistryEntry<Tech>;
    public static HD_EXPLOSIVES: RegistryEntry<Tech>;
    public static SERIAL_WARHEAD: RegistryEntry<Tech>;
    public static FUSION_BOMB: RegistryEntry<Tech>;

    // 能源专精
    public static ENERGY_FORCE: RegistryEntry<Tech>;

    public static ELECTRICAL_SURGES: RegistryEntry<Tech>;
    public static AD_CAPACITANCE: RegistryEntry<Tech>;
    public static ELE_OSCILLATION: RegistryEntry<Tech>;
    public static QUICK_CHARGE: RegistryEntry<Tech>;
    public static ELE_SHIELD: RegistryEntry<Tech>;
    public static DEFLECTOR: RegistryEntry<Tech>;

    public static HIGH_EFFICIENCY_COOLANT: RegistryEntry<Tech>;
    public static HARMONIC_ANALYSIS: RegistryEntry<Tech>;
    public static HIGH_TEMPERATURE_ALLOY: RegistryEntry<Tech>;
    public static ENERGY_RECOVERY: RegistryEntry<Tech>;

    public static CORONA_DISCHARGE: RegistryEntry<Tech>;
    public static STATIC_ELECTRICITY: RegistryEntry<Tech>;

    public static VOID_ENGIN: RegistryEntry<Tech>;
    public static VOID_DISTURBANCE: RegistryEntry<Tech>;
    public static SPACE_TEAR: RegistryEntry<Tech>;
    public static VOID_DWELLER: RegistryEntry<Tech>;
    public static VOID_ENERGY_EXTRACTION: RegistryEntry<Tech>;
    public static VOID_LEAP: RegistryEntry<Tech>;

    public static SHIP_OPT: RegistryEntry<Tech>;
    public static EXPLOSIVE_ARMOR: RegistryEntry<Tech>;
    public static EMERGENCY_REPAIR: RegistryEntry<Tech>;
    public static DECOY_RELEASER: RegistryEntry<Tech>;
    public static SMOKE_LAUNCHER: RegistryEntry<Tech>;

    public static NANOTECHNOLOGY: RegistryEntry<Tech>;
    public static NANO_MENDING: RegistryEntry<Tech>;
    public static ARMOR_EROSION: RegistryEntry<Tech>;
    public static GRAY: RegistryEntry<Tech>;

    public static STEERING_GEAR: RegistryEntry<Tech>;
    public static BALLISTIC_CALCULATOR: RegistryEntry<Tech>;
    public static FIRE_CONTROL_COMPUTER: RegistryEntry<Tech>;
    public static INSTANT_RESPONSE: RegistryEntry<Tech>;
    public static EMERGENCY_WARP: RegistryEntry<Tech>;

    public static SENTINEL_POINT_DEFENSE: RegistryEntry<Tech>;
    public static BARRIER_POINT_DEFENSE: RegistryEntry<Tech>;
    public static GUARDIAN_POINT_DEFENSE: RegistryEntry<Tech>;
    public static FLAK_BATTERY: RegistryEntry<Tech>;
    public static FLAK_CANNONS: RegistryEntry<Tech>;
    public static FLAK_ARTILLERY: RegistryEntry<Tech>;

    public static async init(): Promise<void> {
        let tech: unknown;
        const filePath = './data/tech-data.json';

        if (isServer) {
            const mod = await import('../../worker/fs.ts');
            const buffer = await mod.WorkerFS.fetch(filePath);
            if (!buffer) throw new Error('Failed to load tech data');
            const json = new TextDecoder("utf-8", {fatal: true}).decode(buffer);
            tech = JSON.parse(json);
        } else {
            const resp = await fetch(filePath);
            tech = await resp.json();
        }

        const parsed = TechState.normalizeTechs(tech);
        const fromJson = (name: string) => {
            return this.register(name, parsed.get(name)!.build());
        }

        this.ENERGY_FORCE = fromJson('energy_focus');
        this.ELECTRICAL_SURGES = fromJson('electrical_energy_surges');
        this.AD_CAPACITANCE = fromJson('ad_capacitance');
        this.ELE_OSCILLATION = fromJson('ele_oscillation');
        this.QUICK_CHARGE = fromJson('quick_charge');
        this.ELE_SHIELD = fromJson('ele_shield');
        this.DEFLECTOR = fromJson('deflector');
        this.LASER = fromJson('laser');
        this.HIGH_EFFICIENCY_COOLANT = fromJson('high_efficiency_coolant');
        this.HARMONIC_ANALYSIS = fromJson('harmonic_analysis');
        this.HIGH_TEMPERATURE_ALLOY = fromJson('high_temperature_alloy');
        this.ENERGY_RECOVERY = fromJson('energy_recovery');
        this.GUNBOAT_FOCUS = fromJson('gunboat_focus');
        this.CIWS = fromJson('ciws');
        this.STORM_FIRE = fromJson('storm_fire');
        this.HD_BULLET = fromJson('hd_bullet');
        this.AD_LOADING = fromJson('ad_loading');
        this.ANTIMATTER_WARHEAD = fromJson('antimatter_warhead');
        this.CANNON90 = fromJson('cannon90');
        this.ARTILLERY125 = fromJson('artillery125');
        this.FUSION_BOMB = fromJson('fusion_bomb');
        this.HV_WARHEAD = fromJson('hv_warhead');
        this.HD_EXPLOSIVES = fromJson('hd_explosives');
        this.SERIAL_WARHEAD = fromJson('serial_warhead');
        this.HEAVY_WEAPON = fromJson('heavy_weapon');
        this.ROCKET_LAUNCHER = fromJson('rocket_launcher');
        this.RANDOM_ROCKET = fromJson('random_rocket');
        this.VOID_ENGIN = fromJson('void_engin');
        this.VOID_DISTURBANCE = fromJson('void_disturbance');
        this.SPACE_TEAR = fromJson('space_tear');
        this.VOID_DWELLER = fromJson('void_dweller');
        this.VOID_ENERGY_EXTRACTION = fromJson('void_energy_extraction');
        this.VOID_LEAP = fromJson('void_leap');
        this.SHIP_OPT = fromJson('ship_opt');
        this.EXPLOSIVE_ARMOR = fromJson('explosive_armor');
        this.EMERGENCY_REPAIR = fromJson('emergency_repair');
        this.DECOY_RELEASER = fromJson('decoy_releaser');
        this.ARMOR_EROSION = fromJson('armor_erosion');
        this.GRAY = fromJson('gray');
        this.MISSILE = fromJson('missile');
        this.HONEYCOMB_MISSILE = fromJson('honeycomb_missile');
        this.STEERING_GEAR = fromJson('steering_gear');
        this.FIRE_CONTROL_COMPUTER = fromJson('fire_control_computer');
        this.INSTANT_RESPONSE = fromJson('pointer_following');
        this.EMERGENCY_WARP = fromJson('emergency_warp');
        this.NANOTECHNOLOGY = fromJson('nanotechnology');
        this.NANO_MENDING = fromJson('nano_mending');
        this.CLOUD_LIGHTNING = fromJson('cloud_lightning');
        this.ARC_EMITTER = fromJson('arc_emitter');
        this.FOCUSED_ARC_EMITTER = fromJson('focused_arc_emitter');
        this.SENTINEL_POINT_DEFENSE = fromJson('sentinel_point_defense');
        this.BARRIER_POINT_DEFENSE = fromJson('barrier_point_defense');
        this.GUARDIAN_POINT_DEFENSE = fromJson('guardian_point_defense');
        this.FLAK_BATTERY = fromJson('flak_battery');
        this.FLAK_CANNONS = fromJson('flak_cannons');
        this.FLAK_ARTILLERY = fromJson('flak_artillery');
        this.COILGUNS = fromJson('coilguns');
        this.RAILGUNS = fromJson('railguns');
        this.KINETIC_ARTILLERY = fromJson('kinetic_artillery');
        this.AUTOCANNON = fromJson('autocannon');
        this.EXPLOSIVE = fromJson('explosive');
        this.SPACE_TORPEDOES = fromJson('space_torpedoes');
        this.GAMMA_LASERS = fromJson('gamma_lasers');
        this.PHASE_LASERS = fromJson('phase_lasers');
        this.PARTICLE_LANCE = fromJson('particle_lance');
        this.TACHYON_LANCE = fromJson('tachyon_lance');
        this.BALLISTIC_CALCULATOR = fromJson('ballistic_calculator');
        this.PERDITION_BEAM = fromJson('perdition_beam');
        this.CORONA_DISCHARGE = fromJson('corona_discharge');
        this.STATIC_ELECTRICITY = fromJson('static_electricity');
        this.SMOKE_LAUNCHER = fromJson('smoke_launcher');

        Registries.TECH.getEntries().forEach(entry => entry.getValue().complete());
    }

    private static register(name: string, tech: Tech): RegistryEntry<Tech> {
        return Registry.registerReferenceById(Registries.TECH, Identifier.ofVanilla(name), tech);
    }
}