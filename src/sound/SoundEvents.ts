import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class SoundEvents {
    public static readonly UI_APPLY = this.registerSound("ui.apply");
    public static readonly UI_BUTTON_PRESSED = this.registerSound("ui.button_press");
    public static readonly UI_HOVER = this.registerSound("ui.hover");
    public static readonly UI_MENU_HOVER = this.registerSound("ui.menu_hover");
    public static readonly UI_PAGE_SWITCH = this.registerSound("ui.page_switch");
    public static readonly UI_SELECT = this.registerSound("ui.select");
    public static readonly UI_ERROR = this.registerSound("ui.error");

    public static readonly LASER_OVERHEAT = this.registerSound("laser.overheat_alarm");
    public static readonly LASER_COOLDOWN = this.registerSound("laser.cooldown");
    public static readonly LASER_TRIGGER = this.registerSound("laser.trigger");
    public static readonly LASER_BEAM = this.registerSound("laser.beam");
    public static readonly LASER_BEAM_LOW = this.registerSound("laser.beam_low");
    public static readonly LASER_CHARGE_DOWN = this.registerSound("laser.charge_down");
    public static readonly LASER_FIRE_BEAM = this.registerSound("laser.fire_beam");
    public static readonly LASER_FIRE_SYNTH = this.registerSound("laser.fire_synth");
    public static readonly LASER_FIRE_BEAM_MID = this.registerSound("laser.fire_beam_mid");
    public static readonly LASER_SPINDOWN = this.registerSound("laser.spindown");
    public static readonly LASER_CHARGE_UP = this.registerSound("laser.charge_up");
    public static readonly LASER_CHARGE_UP_LONG = this.registerSound("laser.charge_up_long");
    public static readonly STEAM_RELEASE = this.registerSound("laser.steam_release");

    public static readonly CANNON40_FIRE_LOOP = this.registerSound("cannon40.fire_loop");
    public static readonly CANNON40_FIRE_TAIL = this.registerSound("cannon40.fire_tail");

    public static readonly MINIGUN_FIRE = this.registerSound("minigun.fire");
    public static readonly MINIGUN_FIRE_TAIL = this.registerSound("minigun.fire_tail");
    public static readonly MINIGUN_FIRE_LOOP = this.registerSound("minigun.fire_loop");

    public static readonly CANNON90_FIRE = this.registerSound("cannon90.fire");
    public static readonly CANNON125_FIRE = this.registerSound("cannon125.fire");

    public static readonly CLOUD_LIGHTNING_FIRE = this.registerSound("cloud_lightning.fire");

    public static readonly EMP_BURST = this.registerSound("emp.burst");
    public static readonly SHIELD_CRASH = this.registerSound("shield.crash");

    public static readonly MISSILE_LAUNCH = this.registerSound("missile.launch");
    public static readonly MISSILE_LAUNCH_COMP = this.registerSound("missile.launch_comp");
    public static readonly MISSILE_LAUNCH_LOOP = this.registerSound("missile.launch_loop");
    public static readonly MISSILE_BLASTOFF = this.registerSound("missile.blastoff");
    public static readonly MISSILE_EXPLOSION = this.registerSound("missile.explosion");
    public static readonly MISSILE_PITCHED = this.registerSound("missile.pitched");

    public static readonly CIWS_FIRE_LOOP = this.registerSound("ciws.fire");

    public static readonly WEAPON_READY = this.registerSound("weapon.ready");
    public static readonly EXPLOSION = this.registerSound("explosion.normal");

    public static readonly DECOY_FIRE = this.registerSound("decoy.fire");

    public static readonly PHASE_CHANGE = this.registerSound("phase.change");

    public static readonly ARC_FIRE = this.registerSound("arc.fire");
    public static readonly ARC_LOOP = this.registerSound("arc.loop");
    public static readonly ARC_BURST = this.registerSound("arc.burst");

    public static readonly COILGUNS_FIRE_LOOP = this.registerSound("coilguns.fire_loop");
    public static readonly RAILGUNS_FIRE = this.registerSound("railguns.fire");
    public static readonly KINETIC_ARTILLERY_FIRE = this.registerSound("kinetic_artillery.fire");
    public static readonly KINETIC_ARTILLERY_LOAD = this.registerSound("kinetic_artillery.load");

    public static readonly TORPEDOES_FIRE = this.registerSound("torpedoes.fire");

    private static registerSound(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.SOUND_EVENT, identifier, SoundEvent.of(identifier)).getValue();
    }
}