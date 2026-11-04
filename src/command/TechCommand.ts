import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {Identifier} from "../registry/Identifier.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {Tech} from "../world/tech/Tech.ts";
import type {EntitySelector} from "./EntitySelector.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelectorArgumentType} from "./argument/EntitySelectorArgumentType.ts";
import {IdentifierArgumentType} from "./argument/IdentifierArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {Registries} from "../registry/Registries.ts";

export class TechCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('tech')
                .then(
                    argument<T, EntitySelector>('player', EntitySelectorArgumentType.player())
                        .then(
                            literal<T>('unlock')
                                .then(
                                    argument<T, Identifier>('tech_id', IdentifierArgumentType.identifier())
                                        .executes(ctx => {
                                            this.apply(ctx, (player, entry) => {
                                                const tree = player.getTechs();
                                                if (tree.isUnlocked(entry)) {
                                                    player.sendMessage(`Player already unlock "${entry}"`);
                                                    return;
                                                }

                                                tree.forceUnlock(entry);
                                                player.sendMessage(`Unlocked "${entry}"`);
                                            });
                                        })
                                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.TECH))
                                )
                        )
                        .then(
                            literal<T>('remove')
                                .then(
                                    argument<T, Identifier>('tech_id', IdentifierArgumentType.identifier())
                                        .executes(ctx => {
                                            this.apply(ctx, (player, entry) => {
                                                const tree = player.getTechs();
                                                if (tree.isUnlocked(entry)) {
                                                    tree.resetTech(entry);
                                                    player.sendMessage(`Remove "${entry}"`);
                                                    return;
                                                }
                                                player.sendMessage(`Player didn't unlock "${entry}"`);
                                            });
                                        })
                                        .suggests(CommandUtil.createIdentifierSuggestion(Registries.TECH))
                                )
                        )
                )
                .requires(source => source.hasPermissionLevel(6))
        )
    }

    private static apply<T extends ServerCommandSource>(
        ctx: CommandContext<T>,
        consumer: (player: PlayerEntity, entry: RegistryEntry<Tech>) => void,
    ) {
        const world = CommandUtil.assertWorld(ctx);
        if (world.isClient) return;

        const selector = CommandUtil.assertSelector(ctx, 'player');
        const player = selector.getPlayer(ctx.source);

        const techId = CommandUtil.assert<T, Identifier>(ctx, 'tech_id');
        const tech = Registries.TECH.getEntryById(techId);
        if (!tech) {
            player.sendMessage(`Can not found tech with id: "${techId}"`);
            return;
        }
        consumer(player, tech);
    }
}