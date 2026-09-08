import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {warn} from "@tauri-apps/plugin-log";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {Suggestions} from "../brigadier/suggestion/Suggestions.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {LangManager} from "../i18n/LangManager.ts";
import {Settings} from "../client/settings/Settings.ts";
import {CallTwice} from "../type/errors.ts";

export class LangCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('lang')
                .then(
                    argument<T, string>('name', NormalStringArgumentType.normalString())
                        .executes(async ctx => {
                            const args = ctx.args.get('name');
                            if (!args) {
                                ctx.source.addMessage(`Current language is "${LangManager.currentLang()}"`);
                                return;
                            }

                            const lang = args.result;
                            const result = await Settings.LANG.request(lang);
                            if (result.isOk()) {
                                ctx.source.addMessage(`Set lang to \x1b[32m${result.unwrap()}`);
                                return;
                            }

                            const err = result.unwrapErr();
                            if (err instanceof CallTwice) {
                                ctx.source.addMessage('\x1b[33mSystem is loading, please try later');
                                return;
                            }

                            ctx.source.addMessage(`Fail to load lang \x1b[31m${lang}`);
                            await warn(`Could not load lang ${err}`);
                        })
                        .suggests({
                            async getSuggestions(_: CommandContext<T>, builder: SuggestionsBuilder): Promise<Suggestions> {
                                const mod = await import('../i18n/LangManager.ts');
                                const lang = mod.LangManager.getAllLang();
                                return CommandUtil.suggestMatching(lang, builder);
                            }
                        })
                )
                .executes(ctx => {
                    ctx.source.addMessage(`Current language is "${LangManager.currentLang()}"`);
                })
        );
    }
}