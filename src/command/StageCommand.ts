import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {IllegalArgumentError} from "../apis/errors.ts";

export class StageCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('stage')
                .then(
                    literal<T>('get')
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world) throw new Error('World not initialized');

                            const stage = (world as ServerWorld).stage.getCurrentName();
                            ctx.source.outPut.sendMessage(`Current game stage ${stage ?? 'no stage'}`);
                        })
                        .requires(source => source.hasPermissionLevel(3))
                )
                .then(
                    literal<T>('set')
                        .then(
                            argument<T, string>('name', NormalStringArgumentType.normalString())
                                .executes(ctx => {
                                    const world = ctx.source.getWorld();
                                    if (!world) throw new Error('World not initialized');

                                    const arg = ctx.args.get('name');
                                    if (!arg) throw new IllegalArgumentError('<name> is require');

                                    const name = arg.result as string;
                                    const stage = (world as ServerWorld).stage;

                                    const last = stage.getCurrentName();
                                    if (stage.setStage(name)) {
                                        ctx.source.outPut.sendMessage(`Set game stage to ${name}`);
                                        return;
                                    }

                                    if (last) stage.setStage(last);
                                    else stage.reset();

                                    ctx.source.outPut.sendMessage(`\x1b[31mFail to set stage, reset to last stage`);
                                })
                                .requires(source => source.hasPermissionLevel(6))
                        )
                )
                .then(
                    literal<T>('next')
                        .executes(ctx => {
                            const world = ctx.source.getWorld();
                            if (!world) throw new Error('World not initialized');
                            (world as ServerWorld).stage.nextPhase();
                        })
                        .requires(source => source.hasPermissionLevel(6))
                )
        );
    }
}