import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {IllegalArgumentError} from "../apis/errors.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";

export class WorldDifficultCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('difficulty')
                .then(
                    literal<T>('get')
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world || world.isClient) return;
                            ctx.source.outPut.sendMessage(`Current difficulty is: ${world.stageDifficult}`);
                        })
                )
                .then(
                    literal<T>('set')
                        .then(
                            argument<T, number>('int', IntArgumentType.int())
                                .executes(ctx => {
                                    const arg = ctx.args.get('int');
                                    if (!arg) throw new Error('\x1b[31m<int> is required');

                                    const int = Number(arg.result);
                                    if (!Number.isSafeInteger(int)) throw new IllegalArgumentError('\x1b[31mInvalid argument, must be a integer');
                                    if (int < 0 || int > 3) throw new IllegalArgumentError('\x1b[31mInvalid argument, int must in [0,3]');

                                    const world = ctx.source.getWorld();
                                    if (world) world.stageDifficult = int;
                                    ctx.source.outPut.sendMessage(`World difficult set to: \x1b[32m${int}`);
                                })
                        )
                        .requires(source => source.hasPermissionLevel(6))
                )
        );
    }
}