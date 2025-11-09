import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {literal} from "../brigadier/CommandNodeBuilder.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {CommandError} from "../apis/errors.ts";

export class KillCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kill')
                .then(
                    literal<T>('mobs')
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world) throw new CommandError("No world was found.");
                            if (world.isClient) return;

                            let count = 0;
                            world.getMobs().forEach(mob => {
                                mob.discard();
                                count++;
                            });

                            if (count === 0) {
                                throw new CommandError('\x1b[33mNo target founded.', 'warning');
                            }
                            ctx.source.outPut.sendMessage(`Kill ${count} mobs`);
                        })
                )
                .then(
                    literal<T>('project')
                        .executes(ctx => {
                            const world = ctx.source.getWorld() as ServerWorld;
                            if (!world) throw new CommandError("No world was found.");
                            if (world.isClient) return;

                            let count = 0;
                            world.getProjectiles().forEach(mob => {
                                mob.discard();
                                count++;
                            });

                            if (count === 0) {
                                throw new CommandError('\x1b[33mNo target founded.', 'warning');
                            }
                            ctx.source.outPut.sendMessage(`Kill ${count} projectiles`);
                        })
                )
                .then(
                    literal<T>('all')
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world) throw new CommandError("No world was found.");
                            if (world.isClient) return;

                            let count = 0;
                            world.getEntities().forEach(mob => {
                                if (mob.isPlayer()) return;
                                mob.discard();
                                count++;
                            });

                            if (count === 0) {
                                throw new CommandError('\x1b[33mNo target founded.', 'warning');
                            }
                            ctx.source.outPut.sendMessage(`Kill ${count} entities`);
                        })
                )
                .withRequirement(source => {
                    return source.hasPermissionLevel(8);
                })
        );
    }
}