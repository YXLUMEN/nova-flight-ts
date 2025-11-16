import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import {CommandError} from "../apis/errors.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {EntitySelector} from "./EntitySelector.ts";

export class KillCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kill')
                .then(
                    argument<T, EntitySelector>('selector', EntitySelectorArgumentType.selector())
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world) throw new CommandError("No world was found.");
                            if (world.isClient) return;

                            const selectorResult = ctx.args.get('selector');
                            if (!selectorResult) throw new CommandError("\x1b[33m<selector> is required");

                            const selector = selectorResult.result;
                            if (!(selector instanceof EntitySelector)) {
                                throw new CommandError('');
                            }

                            let count = 0;
                            const entities = selector.getEntities(ctx.source);
                            for (const entity of entities) {
                                if (!entity) continue;
                                count++;
                                entity.kill();
                            }

                            if (count === 0) {
                                throw new CommandError('\x1b[33mNo target founded.', 'warning');
                            }

                            ctx.source.outPut.sendMessage(`Kill ${count} entities`);
                        })
                        .requires(source => {
                            return source.hasPermissionLevel(8);
                        })
                )
                .executes(ctx => {
                    const world = ctx.source.getWorld();
                    const entity = ctx.source.entity;
                    if (!world || world.isClient || !entity) return;
                    entity.kill();
                })
                .requires(source => {
                    return source.hasPermissionLevel(5);
                })
        );
    }
}