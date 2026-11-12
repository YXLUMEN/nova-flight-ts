import type {Predicate, Return} from "../../type/types.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {Options} from "../../database/settings/Options.ts";
import {SettingItem} from "../../database/settings/SettingItem.ts";
import {GatedSettingItem} from "../../database/settings/GatedSettingItem.ts";
import {ClientOptionStorage} from "./ClientOptionStorage.ts";
import {SettingPredicates} from "../../database/settings/SettingPredicates.ts";

// TODO 设置页面;补充设置选项
export class Settings {
    public static readonly OPTIONS = new Options(1,
        new ClientOptionStorage('/configs', 'settings.json')
    );

    public static readonly FPS = this.item<number>(
        'fps',
        'settings.render.fps',
        240,
        SettingPredicates.clampInt(2, 360),
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

    public static readonly SOUND_VOLUME = this.item<number>(
        'sound_volume',
        'settings.volume.sound',
        1,
        SettingPredicates.clampNumber(0, 1),
    );

    public static readonly DAMAGE_POPUP = this.item(
        'damage_popup',
        'settings.render.damage_popup',
        true,
        SettingPredicates.isBool,
    );

    public static readonly TIP_INTERVAL = this.item(
        'tip_interval',
        'settings.tip.intervalms',
        8000,
        SettingPredicates.clampInt(10,120_000)
    );

    // public static readonly AUTO_SAVE = this.item(
    //     'auto_save',
    //     'settings.world.auto_save',
    //     true,
    //     SettingPredicates.isBool,
    // );
    //
    // public static readonly SAVE_INTERVAL = this.item(
    //     'save_interval',
    //     'settings.world.save_interval',
    //     480, // second
    //     SettingPredicates.clampInt(60, 3600),
    // );

    private static item<T>(
        id: string,
        translate: string,
        defaultValue: T,
        predicate: Predicate<T>,
        mapper?: Return<T, T>,
    ): SettingItem<T> {
        const setting = new SettingItem(
            Identifier.ofVanilla(id),
            TranslatableText.of(translate),
            defaultValue,
            predicate,
            mapper,
        );
        this.OPTIONS.add(setting);
        return setting;
    }

    private static gate<T>(
        id: string,
        translate: string,
        defaultValue: T,
        predicate: Predicate<T>,
        mapper?: Return<T, T>,
    ): GatedSettingItem<T> {
        const gate = new GatedSettingItem(
            Identifier.ofVanilla(id),
            TranslatableText.of(translate),
            defaultValue,
            predicate,
            mapper,
        );
        this.OPTIONS.add(gate);
        return gate;
    }
}
