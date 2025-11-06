import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export function commandBarCommand(dispatcher: CommandDispatcher<any>) {
    dispatcher.registry(
        literal<ClientCommandSource>('clear')
            .executes(ctx => {
                ctx.source.getClient().clientCommand.clearAllMessages();
            })
    );
}