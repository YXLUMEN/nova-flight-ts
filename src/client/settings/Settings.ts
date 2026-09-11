import type {Predicate} from "../../type/types.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {Options} from "./Options.ts";
import {SettingItem} from "./SettingItem.ts";
import {GatedSettingItem} from "./GatedSettingItem.ts";
import {OptionStorage} from "./OptionStorage.ts";
import {SettingPredicates} from "./SettingPredicates.ts";

/** WIP */
export class Settings {
    public static readonly OPTIONS = new Options(
        new OptionStorage('/configs', 'settings.json')
    );

    public static readonly FPS = this.item<number>(
        'fps',
        'settings.render.fps',
        100,
        SettingPredicates.clampNumber(2, 240),
    );

    public static readonly LANG = this.gate<string>(
        'lang',
        'settings.lang',
        'zh_cn',
        SettingPredicates.string(16),
    );

    public static readonly MUSIC_VOLUME = this.item<number>(
        'music_volume',
        'settings.volume.music',
        1,
        SettingPredicates.clampNumber(0, 1),
    );

    private static item<T>(
        id: string,
        translate: string,
        defaultValue: T,
        predicate: Predicate<T>
    ): SettingItem<T> {
        const setting = new SettingItem(
            Identifier.ofVanilla(id),
            TranslatableText.of(translate),
            defaultValue,
            predicate,
        );
        this.OPTIONS.add(setting);
        return setting;
    }

    private static gate<T>(
        id: string,
        translate: string,
        defaultValue: T,
        predicate: Predicate<T>
    ): GatedSettingItem<T> {
        const gate = new GatedSettingItem(
            Identifier.ofVanilla(id),
            TranslatableText.of(translate),
            defaultValue,
            predicate,
        );
        this.OPTIONS.add(gate);
        return gate;
    }
}
