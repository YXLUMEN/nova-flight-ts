import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {EntitySelector} from "./EntitySelector.ts";
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
                            argument<T, Identifier>('tech_id', IdentifierArgumentType.identifier())
                                .executes(ctx => {
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

                                    player.getTechs().forceUnlock(tech);
                                    player.sendMessage(`Unlocked "${techId}"`);
                                })
                                .suggests(CommandUtil.createIdentifierSuggestion(Registries.TECH))
                                .requires(source => source.hasPermissionLevel(6))
                        )
                )
        )
    }
}