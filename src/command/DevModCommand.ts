import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {IllegalArgumentError} from "../apis/errors.ts";
import {BoolArgumentType} from "./argument/BoolArgumentType.ts";

export class DevModCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('dev')
                .then(
                    argument<T, boolean>('bool', BoolArgumentType.bool())
                        .executes(ctx => {
                            const arg = ctx.args.get('bool');
                            if (arg === undefined) {
                                throw new IllegalArgumentError('<bool> can not be empty');
                            }
                            console.log(arg);

                            const bool = arg.result;
                            if (typeof bool !== 'boolean') {
                                throw new IllegalArgumentError('Must provide a boolean');
                            }

                            ctx.source.getClient().switchDevMode(bool);
                        })
                )
                .executes(ctx => {
                    ctx.source.getClient().switchDevMode();
                })
                .requires(source => source.hasPermissionLevel(8))
        );
    }
}