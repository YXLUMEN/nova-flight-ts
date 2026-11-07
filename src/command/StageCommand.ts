import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class StageCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('stage')
                .then(
                    literal<T>('get')
                        .executes(ctx => {
                            const world = CommandUtil.assertWorld(ctx);
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
                                    const world = CommandUtil.assertWorld(ctx) as ServerWorld;
                                    const name = CommandUtil.assert(ctx, 'name', String);
                                    const stage = world.stage;

                                    if (stage.trySetPhase(name)) {
                                        world.setPhase(0);
                                        ctx.source.outPut.sendMessage(`Set game stage to ${name}`);
                                        return;
                                    }

                                    ctx.source.outPut.sendMessage(`\x1b[31mFail to set stage, reset to last stage`);
                                })
                                .requires(source => source.hasPermissionLevel(6))
                        )
                )
                .then(
                    literal<T>('next')
                        .executes(ctx => {
                            const world = CommandUtil.assertWorld(ctx) as ServerWorld;
                            world.stage.nextPhase();
                        })
                        .requires(source => source.hasPermissionLevel(6))
                )
        );
    }
}