import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export class CommandBarCommand {
    public static registry(dispatcher: CommandDispatcher<ClientCommandSource>) {
        dispatcher.registry(
            literal<ClientCommandSource>('clear')
                .executes(ctx => {
                    ctx.source.getClient().clientCommandManager.clearAllMessages();
                })
        );
    }
}