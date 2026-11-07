import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {writeTextFile} from "@tauri-apps/plugin-fs";

export class CommandBarCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('cmd')
                .then(
                    literal<T>('clear')
                        .executes(ctx => {
                            ctx.source.getClient().clientCommandManager.clearAllMessages();
                        })
                )
                .then(
                    literal<T>('clear_history')
                        .executes(ctx => {
                            ctx.source.getClient().clientCommandManager.clearHistory();
                        })
                )
                .then(
                    literal<T>('dump')
                        .executes(async ctx => {
                            const result = await ctx.source.getClient().clientCommandManager.dumpHistory();
                            if (result.isErr()) {
                                ctx.source.addMessage(`\x1b[31mFail to get history: ${result.unwrapErr()}`);
                                return;
                            }
                            try {
                                const file = await resolveResource('command_history.txt');
                                await writeTextFile(file, result.unwrap());
                                ctx.source.addMessage(`Success dump to "${file}"`);
                            } catch (err) {
                                ctx.source.addMessage(`\x1b[31mFail to dump: ${err}`);
                            }
                        })
                )
        );
    }
}