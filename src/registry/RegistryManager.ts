import {Registry} from "./Registry.ts";
import {RegistryKey} from "./RegistryKey.ts";
import {RegistryKeys} from "./RegistryKeys.ts";
import {Registries} from "./Registries.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {Items} from "../item/Items.ts";
import {deepFreeze} from "../utils/uit.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import {EntitySelectorOptions} from "../command/EntitySelectorOptions.ts";

export class RegistryManager {
    private readonly registers = new Map<RegistryKey<any>, Registry<any>>();

    public async registerAll(): Promise<void> {
        if (Object.isFrozen(this)) throw new Error('Registry already registered');

        this.registers.set(RegistryKeys.SOUND_EVENT, Registries.SOUND_EVENT);
        this.registers.set(RegistryKeys.AUDIOS, Registries.AUDIOS);
        this.registers.set(RegistryKeys.DAMAGE_TYPE, Registries.DAMAGE_TYPE);
        this.registers.set(RegistryKeys.STATUS_EFFECT, Registries.STATUS_EFFECT);
        this.registers.set(RegistryKeys.ENTITY_TYPE, Registries.ENTITY_TYPE);
        this.registers.set(RegistryKeys.ATTRIBUTE, Registries.ATTRIBUTE);
        this.registers.set(RegistryKeys.ITEM, Registries.ITEM);
        this.registers.set(RegistryKeys.GAME_EVENT, Registries.GAME_EVENT);

        await DamageTypes.init();
        EntityTypes.init();
        Items.init();
        await Registries.complete();
        EntitySelectorOptions.register();
    }

    public get<E>(key: RegistryKey<Registry<E>>): Registry<E> {
        const entry = this.registers.get(key);
        if (entry) {
            return entry;
        } else {
            throw new ReferenceError(`Missing registry: ${key}`);
        }
    }

    public freeze() {
        this.registers.values().forEach(value => value.freeze());
        deepFreeze(this);
    }
}