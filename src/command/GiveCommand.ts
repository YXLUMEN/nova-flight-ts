import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError} from "../type/errors.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {EntitySelector} from "./EntitySelector.ts";
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
                                .executes(this.give)
                                .suggests(CommandUtil.createIdentifierSuggestion(Registries.ITEM))
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(6);
                })
        );
    }

    private static give<T extends ServerCommandSource>(ctx: CommandContext<T>) {
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

            const stack = entity.getItem(item);
            if (stack.isEmpty()) {
                entity.addItem(item);
                const s = entity.getItem(item);
                if (!s.isEmpty()) entity.syncStack(s);
            } else {
                stack.increment(1);
                entity.syncStack(stack);
            }
            entity.sendMessage(`Give item "${itemId}" to ${entity.profile().name}`);
        }
    }
}