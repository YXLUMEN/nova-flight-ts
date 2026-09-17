import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
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
                                    const world = ctx.source.getWorld() as ServerWorld | null;
                                    if (!world) throw new CommandError("No world was found.");
                                    if (world.isClient) return;

                                    const selectorResult = ctx.args.get('target');
                                    if (!selectorResult) throw new CommandError("\x1b[33m<target> is required");

                                    const itemResult = ctx.args.get('item');
                                    if (!itemResult) throw new CommandError("\x1b[33m<item> is required");

                                    const selector = selectorResult.result;
                                    if (!(selector instanceof EntitySelector)) {
                                        throw new CommandError('Not a entity selector');
                                    }

                                    const item = Registries.ITEM.getById(itemResult.result);
                                    if (!item) {
                                        throw new CommandError(`\x1b[33mItem was not found with ID: "${itemResult.result}"`);
                                    }

                                    const entities = selector.getEntities(ctx.source);
                                    for (const entity of entities) {
                                        if (!(entity instanceof ServerPlayerEntity)) continue;
                                        entity.removeItem(item);
                                        entity.sendMessage(`Remove item "${itemResult.result}" at ${entity.profile().name}`);
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