import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export class DamageCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('reload')
                .then(
                    literal<T>('tech')
                        .executes(ctx => {

                        })
                        .requires(source => source.hasPermissionLevel(8))
                )
        );
    }
}