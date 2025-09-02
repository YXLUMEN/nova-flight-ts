import {TagKey} from "./TagKey.ts";
import type {DamageType} from "../../entity/damage/DamageType.ts";
import {RegistryKeys} from "../RegistryKeys.ts";
import {Identifier} from "../Identifier.ts";

export class DamageTypeTags {
    public static readonly BYPASSES_INVULNERABLE = this.of('bypasses_invulnerable');
    public static readonly BYPASSES_EFFECTS = this.of("bypasses_effects");
    public static readonly NOT_GAIN_SCORE = this.of("not_gain_score");
    public static readonly INCENDIARY = this.of("incendiary");
    public static readonly REPLY_LASER = this.of("reply_laser");

    private static of(id: string): TagKey<DamageType> {
        return TagKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla(id));
    }
}


