import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {CommandError} from "../apis/errors.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {EntitySelector} from "./EntitySelector.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {Registries} from "../registry/Registries.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class GiveCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('give')
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
                                        const stack = entity.getItem(item);
                                        if (stack.isEmpty()) {
                                            entity.addItem(item);
                                            const s = entity.getItem(item);
                                            if (!s.isEmpty()) entity.syncStack(s);
                                        } else {
                                            stack.increment(1);
                                            entity.syncStack(stack);
                                        }
                                        entity.sendMessage(`Give item "${itemResult.result}" to ${entity.getProfile().name}`);
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