import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import {CommandError} from "../type/errors.ts";

export class TickCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('tick')
                .then(
                    literal<T>('rate')
                        .then(
                            argument<T, number>('rate', IntArgumentType.int())
                                .executes(ctx => {
                                    const rate = ctx.args.get('rate')?.result;
                                    if (typeof rate !== 'number') {
                                        throw new CommandError('"rate" must be a number');
                                    }
                                    if (!Number.isSafeInteger(rate) || rate <= 0 || rate > 100) {
                                        throw new CommandError('"rate" must be a integer which between 1-100');
                                    }

                                    ctx.source.getPlayer()?.sendMessage(`Tick rate set to ${rate}`);
                                    ctx.source.server.getTickManager().setRate(rate);
                                })
                        )
                )
                .requires(val => val.hasPermissionLevel(9))
        );
    }
}