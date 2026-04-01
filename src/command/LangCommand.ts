import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {LangManager} from "../i18n/LangManager.ts";

export class LangCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('lang')
                .then(
                    argument<T, string>('name', NormalStringArgumentType.normalString())
                        .executes(ctx => {
                            const args = ctx.args.get('name');
                            if (!args) {
                                ctx.source.addMessage(`Current language is "${LangManager.getCurrentLang()}"`);
                                return;
                            }

                            LangManager.changeLang(args.result)
                                .then(() => {
                                    ctx.source.addMessage(`Set lang to ${args.result}`);
                                })
                                .catch(() => {
                                    ctx.source.addMessage(`Fail to load lang ${args.result}`);
                                });
                        })
                )
                .executes(ctx => {
                    ctx.source.addMessage(`Current language is "${LangManager.getCurrentLang()}"`);
                })
        );
    }
}