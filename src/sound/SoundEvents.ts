import {Identifier} from "../registry/Identifier.ts";
import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class SoundEvents {
    public static readonly EMPTY = this.register('empty');

    public static readonly UI_APPLY = this.register("ui.apply");
    public static readonly UI_BUTTON_PRESSED = this.register("ui.button_press");
    public static readonly UI_HOVER = this.register("ui.hover");
    public static readonly UI_MENU_HOVER = this.register("ui.menu_hover");
    public static readonly UI_PAGE_SWITCH = this.register("ui.page_switch");
    public static readonly UI_SELECT = this.register("ui.select");
    public static readonly UI_ERROR = this.register("ui.error");

    public static readonly LASER_OVERHEAT = this.register("laser.overheat_alarm");
    public static readonly LASER_COOLDOWN = this.register("laser.cooldown");
    public static readonly LASER_TRIGGER = this.register("laser.trigger");
    public static readonly LASER_BEAM = this.register("laser.beam");
    public static readonly LASER_BEAM_LOW = this.register("laser.beam_low");
    public static readonly LASER_CHARGE_DOWN = this.register("laser.charge_down");
    public static readonly LASER_FIRE_BEAM = this.register("laser.fire_beam");
    public static readonly LASER_FIRE_SYNTH = this.register("laser.fire_synth");
    public static readonly LASER_FIRE_BEAM_MID = this.register("laser.fire_beam_mid");
    public static readonly LASER_SPINDOWN = this.register("laser.spindown");
    public static readonly LASER_CHARGE_UP = this.register("laser.charge_up");
    public static readonly LASER_CHARGE_UP_LONG = this.register("laser.charge_up_long");
    public static readonly STEAM_RELEASE = this.register("laser.steam_release");

    public static readonly CANNON40_FIRE_LOOP = this.register("cannon40.fire_loop");
    public static readonly CANNON40_FIRE_TAIL = this.register("cannon40.fire_tail");

    public static readonly MINIGUN_FIRE = this.register("minigun.fire");
    public static readonly MINIGUN_FIRE_TAIL = this.register("minigun.fire_tail");
    public static readonly MINIGUN_FIRE_LOOP = this.register("minigun.fire_loop");

    public static readonly STORM_FIRE_WARMUP = this.register("storm_fire.warm_up");
    public static readonly STORM_FIRE_LOOP = this.register("storm_fire.fire_loop");
    public static readonly STORM_FIRE_END = this.register("storm_fire.fire_end");

    public static readonly CANNON90_FIRE = this.register("cannon90.fire");
    public static readonly CANNON125_FIRE = this.register("cannon125.fire");

    public static readonly CLOUD_LIGHTNING_FIRE = this.register("cloud_lightning.fire");

    public static readonly EMP_BURST = this.register("emp.burst");
    public static readonly SHIELD_CRASH = this.register("shield.crash");

    public static readonly MISSILE_LAUNCH = this.register("missile.launch");
    public static readonly MISSILE_LAUNCH_COMP = this.register("missile.launch_comp");
    public static readonly MISSILE_LAUNCH_LOOP = this.register("missile.launch_loop");
    public static readonly MISSILE_BLASTOFF = this.register("missile.blastoff");
    public static readonly MISSILE_EXPLOSION = this.register("missile.explosion");
    public static readonly MISSILE_PITCHED = this.register("missile.pitched");

    public static readonly CIWS_FIRE_LOOP = this.register("ciws.fire");

    public static readonly WEAPON_READY = this.register("weapon.ready");

    public static readonly EXPLOSION = this.register("explosion.normal");
    public static readonly BLAST = this.register('explosion.blast');
    public static readonly BLAST_FAR = this.register('explosion.blast_far');
    public static readonly LARGE_BLAST = this.register('explosion.large_blast');
    public static readonly LARGE_BLAST_FAR = this.register('explosion.large_blast_far');

    public static readonly DECOY_FIRE = this.register("decoy.fire");

    public static readonly PHASE_CHANGE = this.register("phase.change");

    public static readonly ARC_FIRE = this.register("arc.fire");
    public static readonly ARC_LOOP = this.register("arc.loop");
    public static readonly ARC_BURST = this.register("arc.burst");

    public static readonly COILGUNS_FIRE_LOOP = this.register("coilguns.fire_loop");
    public static readonly RAILGUNS_FIRE = this.register("railguns.fire");
    public static readonly KINETIC_ARTILLERY_FIRE = this.register("kinetic_artillery.fire");
    public static readonly KINETIC_ARTILLERY_LOAD = this.register("kinetic_artillery.load");

    public static readonly TORPEDOES_FIRE = this.register("torpedoes.fire");

    public static readonly BARREL_OPEN = this.register("barrel_open");
    public static readonly SHELL_RELOAD = this.register("shell_reload");

    private static register(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.SOUND_EVENT, identifier, SoundEvent.of(identifier)).getValue();
    }
}