import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {CommandError} from "../apis/errors.ts";
import {PlayerSelectorArgumentType} from "./argument/PlayerSelectorArgumentType.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";

export class KickCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('kick')
                .then(
                    argument<T, string>('player', PlayerSelectorArgumentType.selector())
                        .executes(ctx => {
                            const world = ctx.source.getWorld() as ServerWorld | null;
                            if (!world) throw new CommandError("No world was found.");
                            if (world.isClient) return;

                            const selectorResult = ctx.args.get('player');
                            if (!selectorResult) throw new CommandError("\x1b[33m<selector> is required");

                            const playerName = selectorResult.result;
                            if (typeof playerName !== 'string') {
                                throw new CommandError('Not a entity selector');
                            }

                            const player = world
                                .getPlayers()
                                .find(player => player.getProfile().name === playerName);

                            if (!player) {
                                throw new CommandError('\x1b[33mNo target founded.');
                            }

                            if (world.getServer().isHost(player.getProfile())) {
                                ctx.source.outPut.sendMessage(`Can not kick the host player`);
                                return;
                            }

                            player.session!.forceDisconnect();
                            ctx.source.outPut.sendMessage(`Kick ${playerName}`);
                        })
                )
                .requires(source => {
                    return source.hasPermissionLevel(9);
                })
        );
    }
}