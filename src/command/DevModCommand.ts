import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export class DevModCommand {
    public static registry(dispatcher: CommandDispatcher<ClientCommandSource>) {
        dispatcher.registry(
            literal<ClientCommandSource>('dev')
                .executes(ctx => {
                    ctx.source.getClient().switchDevMode();
                })
                .withRequirement(source => source.hasPermissionLevel(8))
        );
    }
}