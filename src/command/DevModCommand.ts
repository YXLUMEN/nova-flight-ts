import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export function devModCommand(dispatcher: CommandDispatcher<any>) {
    dispatcher.registry(
        literal<ClientCommandSource>('dev')
            .executes(ctx => {
                ctx.source.getClient().switchDevMode();
            })
    );
}