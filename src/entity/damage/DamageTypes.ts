import {RegistryKey} from "../../registry/RegistryKey.ts";
import {RegistryKeys} from "../../registry/RegistryKeys.ts";
import {Identifier} from "../../registry/Identifier.ts";

export class DamageTypes {
    public static readonly GENERIC = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("generic"));
    public static readonly REMOVED = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("removed"));
    public static readonly MOB_ATTACK = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("mob_attack"));
    public static readonly PLAYER_ATTACK = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("player_attack"));
    public static readonly MOB_PROJECTILE = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("mob_projectile"));
    public static readonly EXPLOSION = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("explosion"));
    public static readonly LASER = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("laser"));
    public static readonly PLAYER_IMPACT = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("player_impact"));
    public static readonly VOID = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("void"));
    public static readonly ON_FIRE = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("on_fire"));
    public static readonly AP_DAMAGE = RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla("ap_damage"));
}

