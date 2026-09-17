import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

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
        );
    }
}