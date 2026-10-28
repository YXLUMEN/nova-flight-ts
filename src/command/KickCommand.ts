import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError} from "../type/errors.ts";
import {PlayerSelectorArgumentType} from "./argument/PlayerSelectorArgumentType.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {CommandUtil} from "./CommandUtil.ts";

export class KickCommand {
    private static readonly KICK = TranslatableText.of("network.disconnect.kicked");

    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kick')
                .then(
                    argument<T, string>('player', PlayerSelectorArgumentType.selector())
                        .executes(ctx => {
                            const world = CommandUtil.assertWorld(ctx) as ServerWorld;
                            if (world.isClient) return;

                            const playerName = CommandUtil.assert(ctx, 'player', String);
                            const players = world
                                .getPlayers()
                                .filter(player => player.profile().name === playerName)
                                .toArray();

                            if (players.length === 0) {
                                throw new CommandError('\x1b[33mNo target founded.');
                            }

                            for (const player of players) {
                                if (world.getServer().isHost(player.profile())) {
                                    ctx.source.outPut.sendMessage(`Can not kick the host player`);
                                    continue;
                                }

                                player.networkHandler!.disconnect(this.KICK);
                                ctx.source.outPut.sendMessage(`Kick ${playerName}`);
                            }
                        })
                )
                .requires(source => {
                    return source.hasPermissionLevel(9);
                })
        );
    }
}