import type {Registry} from "./Registry.ts";
import type {RegistryKey} from "./RegistryKey.ts";
import {deepFreeze} from "../utils/uit.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Registries} from "./Registries.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {Items} from "../item/Items.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import {EntitySelectorOptions} from "../command/EntitySelectorOptions.ts";
import {NbtTypes} from "../nbt/NbtTypes.ts";
import {Techs} from "../world/tech/Techs.ts";
import {VisualEffectTypes} from "../effect/VisualEffectTypes.ts";

export class RegistryManager {
    private readonly registers: Map<RegistryKey<any>, Registry<any>> = new Map();

    public async registerAll(): Promise<void> {
        if (Object.isFrozen(this)) throw new Error('Registry already registered');

        NbtTypes.init();

        this.registers.set(RegistryKeys.DAMAGE_TYPE, Registries.DAMAGE_TYPE);
        this.registers.set(RegistryKeys.STATUS_EFFECT, Registries.STATUS_EFFECT);
        this.registers.set(RegistryKeys.ENTITY_TYPE, Registries.ENTITY_TYPE);
        this.registers.set(RegistryKeys.ATTRIBUTE, Registries.ATTRIBUTE);
        this.registers.set(RegistryKeys.SOUND_EVENT, Registries.SOUND_EVENT);
        this.registers.set(RegistryKeys.AUDIOS, Registries.AUDIOS);
        this.registers.set(RegistryKeys.ITEM, Registries.ITEM);
        this.registers.set(RegistryKeys.DATA_COMPONENT_TYPE, Registries.DATA_COMPONENT_TYPE);
        this.registers.set(RegistryKeys.VISUAL_EFFECT_TYPE, Registries.VISUAL_EFFECT_TYPE);
        this.registers.set(RegistryKeys.TECH, Registries.TECH);
        this.registers.set(RegistryKeys.PARTICLES, Registries.PARTICLES);

        await Techs.init();
        await DamageTypes.init();
        EntityTypes.init();
        Items.init();
        VisualEffectTypes.init();
        await Registries.complete();
        EntitySelectorOptions.register();
    }

    public get<E>(key: RegistryKey<Registry<E>>): Registry<E> {
        const entry = this.registers.get(key);
        if (entry) {
            return entry;
        }
        throw new ReferenceError(`Missing registry: ${key}`);
    }

    public freeze() {
        this.registers.values().forEach(r => r.checkBeforeFreeze());
        deepFreeze(this, obj => obj instanceof TranslatableText);
    }
}