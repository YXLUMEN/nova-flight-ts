import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {CommandError} from "../apis/errors.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";

export class ScoreCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('score')
                .then(
                    argument<T, EntitySelector>('target', EntitySelectorArgumentType.players())
                        .executes(this.giveScore.bind(this))
                        .then(
                            argument<T, number>('int', IntArgumentType.int())
                                .executes(this.giveScore.bind(this))
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(6);
                })
        );
    }

    private static giveScore<T extends ServerCommandSource>(ctx: CommandContext<T>) {
        const world = ctx.source.getWorld() as ServerWorld | null;
        if (!world) throw new CommandError("No world was found.");
        if (world.isClient) return;

        const selectorResult = ctx.args.get('target');
        if (!selectorResult) throw new CommandError("\x1b[33m<target> is required");

        const selector = selectorResult.result;
        if (!(selector instanceof EntitySelector)) {
            throw new CommandError('Not a entity selector');
        }

        const scoreResult = ctx.args.get('int');
        const score = scoreResult === undefined ? 1 : parseInt(scoreResult.result);

        const entities = selector.getEntities(ctx.source);
        for (const entity of entities) {
            if (entity instanceof ServerPlayerEntity) {
                entity.setScore(entity.getScore() + score);
            }
        }
    }
}