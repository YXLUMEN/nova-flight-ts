import {Registry} from "./Registry.ts";
import {RegistryKey} from "./RegistryKey.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Identifier} from "./Identifier.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import type {DamageType} from "../entity/damage/DamageType.ts";
import {DamageTypeTags} from "./tag/DamageTypeTags.ts";
import {Registries} from "./Registries.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {Items} from "../item/items.ts";
import {deepFreeze} from "../utils/uit.ts";

export class RegistryManager {
    private readonly registers = new Map<RegistryKey<any>, Registry<any>>();

    public async registerAll(): Promise<void> {
        this.registers.set(RegistryKeys.SOUND_EVENT, Registries.SOUND_EVENT);

        const damage = new Registry<DamageType>(RegistryKey.ofRegistry(Identifier.ofVanilla("damage_type")));
        damage.add(DamageTypes.LASER, 'laser', [DamageTypeTags.REPLY_LASER]);
        damage.add(DamageTypes.PLAYER_ATTACK, 'player_attack');
        damage.add(DamageTypes.EXPLOSION, 'explosion');
        damage.add(DamageTypes.VOID, 'void', [DamageTypeTags.NOT_GAIN_SCORE]);
        damage.add(DamageTypes.GENERIC, 'generic');
        damage.add(DamageTypes.ON_FIRE, 'on_fire', [DamageTypeTags.REPLY_LASER]);
        damage.add(DamageTypes.REMOVED, 'removed', [DamageTypeTags.BYPASSES_INVULNERABLE]);
        damage.add(DamageTypes.MOB_PROJECTILE, 'mob_projectile');
        damage.add(DamageTypes.PLAYER_IMPACT, 'player_impact', [DamageTypeTags.NOT_GAIN_SCORE]);
        damage.add(DamageTypes.AP_DAMAGE, 'app_damage', [DamageTypeTags.BYPASSES_INVULNERABLE]);

        this.registers.set(RegistryKeys.DAMAGE_TYPE, damage);
        this.registers.set(RegistryKeys.STATUS_EFFECT, Registries.STATUS_EFFECT);
        this.registers.set(RegistryKeys.ENTITY_TYPE, Registries.ENTITY_TYPE);
        this.registers.set(RegistryKeys.ATTRIBUTE, Registries.ATTRIBUTE);
        this.registers.set(RegistryKeys.ITEM, Registries.ITEM);
        this.registers.set(RegistryKeys.GAME_EVENT, Registries.GAME_EVENT);

        EntityTypes.init();
        Items.init();
        await Registries.complete();
    }

    public get<E>(key: RegistryKey<Registry<E>>): Registry<E> {
        const entry = this.registers.get(key);
        if (entry) {
            return entry;
        } else {
            throw new ReferenceError(`Missing registry: ${key}`);
        }
    }

    public frozen() {
        deepFreeze(this);
    }
}