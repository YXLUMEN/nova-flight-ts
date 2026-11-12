import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {validateIpv4} from "../utils/address_util.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {CommandUtil} from "./CommandUtil.ts";
import {IllegalArgumentError} from "../type/errors.ts";
import {RelayActionBuilder} from "../server/network/RelayActionBuilder.ts";

export class UnbanCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('unban')
                .then(
                    argument<T, string>('ip', NormalStringArgumentType.normalString())
                        .executes(ctx => {
                            const world = CommandUtil.assertWorld(ctx) as ServerWorld;
                            if (world.isClient) return;

                            const ip = CommandUtil.assert(ctx, 'ip', String);
                            if (!validateIpv4(ip)) {
                                throw new IllegalArgumentError(`Invalid IPv4`);
                            }

                            ctx.source.server.networkChannel.action(RelayActionBuilder.unbanIp(ip));
                            ctx.source.outPut.sendMessage(`Announce relay to unban "${ip}"`);
                        })
                )
                .requires(source => {
                    return source.hasPermissionLevel(9);
                })
        );
    }
}