import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";
import {SoundEvent} from "./SoundEvent.ts";

export class SoundEvents {
    public static readonly LASER_OVERHEAT = this.registerSound("laser.overheat_alarm");
    public static readonly LASER_COOLDOWN = this.registerSound("laser.cooldown");
    public static readonly LASER_TRIGGER = this.registerSound("laser.trigger");
    public static readonly LASER_BEAM = this.registerSound("laser.beam");
    public static readonly LASER_CHARGE_DOWN = this.registerSound("laser.charge_down");

    public static readonly CANNON40_FIRE = this.registerSound("cannon40.fire");
    public static readonly CANNON40_FIRE_NX = this.registerSound("cannon40.fire_nx");
    public static readonly CANNON40_FIRE_MECH = this.registerSound("cannon40.fire_mech");

    public static readonly MINIGUN_FIRE = this.registerSound("minigun.fire");

    public static readonly CANNON90_FIRE = this.registerSound("cannon90.fire");

    public static readonly EMP_BURST = this.registerSound("emp.burst");

    private static registerSound(id: string) {
        const identifier = Identifier.ofVanilla(id);
        return Registry.registerReferenceById(Registries.SOUND_EVENT, identifier, SoundEvent.of(identifier)).getValue();
    }
}