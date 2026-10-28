import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError} from "../type/errors.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class KillCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kill')
                .then(
                    argument<T, EntitySelector>('selector', EntitySelectorArgumentType.entities())
                        .executes(ctx => {
                            const world = CommandUtil.assertWorld(ctx);
                            if (world.isClient) return;

                            const selector = CommandUtil.assertSelector(ctx, 'selector');

                            let count = 0;
                            const entities = selector.getEntities(ctx.source);
                            for (const entity of entities) {
                                count++;
                                entity.kill();
                            }

                            if (count === 0) {
                                throw new CommandError('\x1b[33mNo target founded.');
                            }

                            ctx.source.outPut.sendMessage(`Kill ${count} entities`);
                        })
                        .requires(source => {
                            return source.hasPermissionLevel(8);
                        })
                )
        );
    }
}