import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandError} from "../type/errors.ts";
import {Registries} from "../registry/Registries.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class RemoveCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('remove')
                .then(
                    argument<T, EntitySelector>('target', EntitySelectorArgumentType.players())
                        .then(
                            argument<T, Identifier>('item', IdentifierArgumentType.identifier())
                                .executes(ctx => {
                                    const world = CommandUtil.assertWorld(ctx);
                                    if (world.isClient) return;

                                    const selector = CommandUtil.assertSelector(ctx, 'target');
                                    const itemId = CommandUtil.assert<T, Identifier>(ctx, 'item');

                                    const item = Registries.ITEM.getById(itemId);
                                    if (!item) {
                                        throw new CommandError(`\x1b[33mItem was not found with ID: "${itemId}"`);
                                    }

                                    const entities = selector.getEntities(ctx.source);
                                    for (const entity of entities) {
                                        if (!(entity instanceof ServerPlayerEntity)) continue;
                                        entity.removeItem(item);
                                        entity.sendMessage(`Remove item "${itemId}" at ${entity.profile().name}`);
                                    }
                                })
                                .suggests(CommandUtil.createIdentifierSuggestion(Registries.ITEM))
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(6);
                })
        );
    }
}