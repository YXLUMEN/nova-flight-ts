import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {validateIpv4} from "../utils/address_util.ts";
import {isClient} from "../configs/RuntimeConfig.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {IllegalArgumentError} from "../type/errors.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {RelayActionBuilder} from "../server/network/RelayActionBuilder.ts";
import {PlayerSelectorArgumentType} from "./argument/PlayerSelectorArgumentType.ts";

export class BanCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('ban')
                .then(
                    literal<T>('player')
                        .then(
                            argument<T, string>('player', PlayerSelectorArgumentType.selector())
                                .executes(ctx => {
                                    if (isClient) return;
                                    const server = ctx.source.server;
                                    const channel = server.networkChannel;
                                    const name = CommandUtil.assert(ctx, 'player', String);
                                    const players = CommandUtil.filterPlayer(ctx, name);

                                    for (const player of players) {
                                        if (server.isHost(player.profile())) {
                                            ctx.source.outPut.sendMessage('Can not ban the host player');
                                            continue;
                                        }

                                        const handler = player.networkHandler;
                                        handler.disconnect('network.baned');
                                        const host = handler.addr().host;
                                        channel.action(RelayActionBuilder.banIp(host));

                                        ctx.source.outPut.sendMessage(`Ban player "${player.profile().name}" with host ${host}`);
                                    }
                                })
                        )
                )
                .then(
                    literal<T>('ip')
                        .then(
                            argument<T, string>('ip', NormalStringArgumentType.normalString())
                                .executes(ctx => {
                                    if (isClient) return;
                                    const host = CommandUtil.assert(ctx, 'ip', String);
                                    if (!validateIpv4(host)) throw new IllegalArgumentError(`Invalid IPv4`);

                                    ctx.source.server.networkChannel.action(RelayActionBuilder.banIp(host));
                                    ctx.source.outPut.sendMessage(`Ban ip "${host}"`);
                                })
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(9);
                })
        );
    }
}