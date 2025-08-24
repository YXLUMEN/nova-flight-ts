import {TagKey} from "./TagKey.ts";
import type {DamageType} from "../../entity/damage/DamageType.ts";
import {RegistryKeys} from "../RegistryKeys.ts";
import {Identifier} from "../Identifier.ts";

export class DamageTypeTags {
    public static readonly BYPASSES_INVULNERABLE = DamageTypeTags.of('bypasses_invulnerable');
    public static readonly BYPASSES_EFFECTS = DamageTypeTags.of("bypasses_effects");
    public static readonly GAIN_SCORE = DamageTypeTags.of("gain_score");
    public static readonly INCENDIARY = DamageTypeTags.of("incendiary");
    public static readonly REPLY_LASER = DamageTypeTags.of("reply_laser");

    private static of(id: string): TagKey<DamageType> {
        return TagKey.of(RegistryKeys.DAMAGE_TYPE, Identifier.ofVanilla(id));
    }
}


