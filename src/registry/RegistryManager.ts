import type {Registry} from "./Registry.ts";
import type {RegistryKey} from "./RegistryKey.ts";
import type {RecordManager} from "../database/data/RecordManager.ts";
import {deepFreeze} from "../utils/util.ts";
import {Registries} from "./Registries.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import {EntitySelectorOptions} from "../command/EntitySelectorOptions.ts";
import {NbtTypes} from "../nbt/NbtTypes.ts";
import {Techs} from "../world/tech/Techs.ts";
import {VisualEffectTypes} from "../effect/VisualEffectTypes.ts";

export class RegistryManager {
    private root: Registry<Registry<unknown>> = null!;

    public async registerAll(record: RecordManager): Promise<void> {
        if (Object.isFrozen(this)) throw new Error('Registry already registered');

        // 显式初始化所有静态注册表
        this.root = Registries.root();

        // 需要加载资源或者有引用问题的项目
        NbtTypes.init();
        await Techs.init(record);
        await DamageTypes.init(record);
        EntityTypes.init();
        VisualEffectTypes.init();
        EntitySelectorOptions.init();
    }

    public get<E>(key: RegistryKey<Registry<E>>): Registry<E> {
        const entry = this.root.getEntryByKey(key);
        if (entry) return entry.getValue() as Registry<E>;
        throw new ReferenceError(`Missing registry: ${key}`);
    }

    public freeze() {
        for (const registry of this.root) {
            registry.checkBeforeFreeze();
        }
        deepFreeze(this, obj => obj instanceof TranslatableText);
    }
}