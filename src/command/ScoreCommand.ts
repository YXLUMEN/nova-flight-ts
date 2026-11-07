import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {IllegalArgumentError} from "../type/errors.ts";

export class ScoreCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('score')
                .then(
                    argument<T, EntitySelector>('target', EntitySelectorArgumentType.players())
                        .then(
                            literal<T>('set')
                                .then(
                                    argument<T, number>('score', IntArgumentType.int())
                                        .executes(ctx => this.giveScore(ctx, false))
                                )
                        )
                        .then(
                            literal<T>('add')
                                .then(
                                    argument<T, number>('score', IntArgumentType.int())
                                        .executes(ctx => this.giveScore(ctx, true))
                                )
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(6);
                })
        );
    }

    private static giveScore<T extends ServerCommandSource>(ctx: CommandContext<T>, add: boolean) {
        const world = CommandUtil.assertWorld(ctx);
        if (world.isClient) return;

        const selector = CommandUtil.assertSelector(ctx, 'target');
        const score = CommandUtil.assert(ctx, 'score', Number);
        if (!Number.isSafeInteger(score)) throw new IllegalArgumentError('Score must be an int');

        const entities = selector.getEntities(ctx.source);
        for (const entity of entities) {
            if (entity instanceof ServerPlayerEntity) {
                if (add) entity.addScore(score);
                else entity.setScore(score);
            }
        }
    }
}