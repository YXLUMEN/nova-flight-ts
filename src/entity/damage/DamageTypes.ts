import {RegistryKey} from "../../registry/RegistryKey.ts";
import {RegistryKeys} from "../../registry/RegistryKeys.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {Registries} from "../../registry/Registries.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";

export class DamageTypes {
    public static readonly GENERIC = this.registry("generic");
    public static readonly REMOVED = this.registry("removed");
    public static readonly MOB_ATTACK = this.registry("mob_attack");
    public static readonly PLAYER_ATTACK = this.registry("player_attack");
    public static readonly MOB_PROJECTILE = this.registry("mob_projectile");
    public static readonly EXPLOSION = this.registry("explosion");
    public static readonly LASER = this.registry("laser");
    public static readonly PLAYER_IMPACT = this.registry("player_impact");
    public static readonly VOID = this.registry("void");
    public static readonly ON_FIRE = this.registry("on_fire");
    public static readonly AP_DAMAGE = this.registry("ap_damage");

    public static async init() {
        const damage = Registries.DAMAGE_TYPE;
        damage.add(this.GENERIC, 'generic');
        damage.add(this.REMOVED, 'removed', DamageTypeTags.BYPASSES_INVULNERABLE, DamageTypeTags.NOT_GAIN_SCORE);
        damage.add(this.MOB_ATTACK, 'mobAttack');
        damage.add(this.PLAYER_ATTACK, 'playerAttack');
        damage.add(this.MOB_PROJECTILE, 'mobProjectile');
        damage.add(this.EXPLOSION, 'explosion');
        damage.add(this.LASER, 'laser', DamageTypeTags.REPLY_LASER);
        damage.add(this.PLAYER_IMPACT, 'playerImpact', DamageTypeTags.NOT_GAIN_SCORE);
        damage.add(this.VOID, 'void', DamageTypeTags.NOT_GAIN_SCORE);
        damage.add(this.ON_FIRE, 'onFire', DamageTypeTags.REPLY_LASER);
        damage.add(this.AP_DAMAGE, 'apDamage', DamageTypeTags.BYPASSES_INVULNERABLE);
    }

    private static registry(id: string) {
        return RegistryKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla(id));
    }
}
