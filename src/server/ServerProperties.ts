import type {Predicate} from "../type/types.ts";
import {Options} from "../database/settings/Options.ts";
import {ServerOptionStorage} from "./storage/ServerOptionStorage.ts";
import {SettingItem} from "../database/settings/SettingItem.ts";
import {Identifier} from "../registry/Identifier.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {SettingPredicates} from "../database/settings/SettingPredicates.ts";

export class ServerProperties {
    // 服务器配置通常不应该在运行时改变
    // 但为了在配置不存在时创建,保留了写入文件的能力
    public static readonly OPTIONS = new Options(1,
        new ServerOptionStorage('server.properties.json')
    );

    public static readonly MAX_PLAYERS = this.item<number>(
        'max_players',
        5,
        SettingPredicates.clampInt(1, 32),
    );

    public static readonly PLAYER_AFK_TIMEOUT = this.item<number>(
        'player_afk_timeout',
        20_000,
        SettingPredicates.clampInt(10_000, 600_000),
    );

    public static readonly ENCRYPT_CHANNEL = this.item<boolean>(
        'encrypt_channel',
        false,
        SettingPredicates.isBool,
    );

    // 需要启动加密通道
    public static readonly PLAYER_VERIFY = this.item<boolean>(
        'player_verify',
        false,
        SettingPredicates.isBool,
    );

    private static item<T>(
        id: string,
        defaultValue: T,
        predicate: Predicate<T>,
    ): SettingItem<T> {
        const setting = new SettingItem(
            Identifier.ofVanilla(id),
            TranslatableText.NONE,
            defaultValue,
            predicate,
        );
        this.OPTIONS.add(setting);
        return setting;
    }
}