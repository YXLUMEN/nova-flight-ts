import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError} from "../type/errors.ts";
import {PlayerSelectorArgumentType} from "./argument/PlayerSelectorArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {isClient} from "../configs/RuntimeConfig.ts";

export class KickCommand {
    private static readonly KICK = 'network.disconnect.kicked';

    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kick')
                .then(
                    argument<T, string>('player', PlayerSelectorArgumentType.selector())
                        .executes(ctx => {
                            if (isClient) return;
                            const server = ctx.source.server;
                            const playerName = CommandUtil.assert(ctx, 'player', String);
                            const players = CommandUtil.filterPlayer(ctx, playerName);
                            if (players.length === 0) {
                                throw new CommandError('\x1b[33mNo target founded.');
                            }

                            for (const player of players) {
                                if (server.isHost(player.profile())) {
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