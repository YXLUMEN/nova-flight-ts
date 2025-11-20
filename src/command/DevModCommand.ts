import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {IllegalArgumentError} from "../apis/errors.ts";
import {BoolArgumentType} from "./argument/BoolArgumentType.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import {ServerPlayerEntity} from "../server/entity/ServerPlayerEntity.ts";
import type {ServerWorld} from "../server/ServerWorld.ts";
import {SyncPlayerProfileS2CPacket} from "../network/packet/s2c/SyncPlayerProfileS2CPacket.ts";

export class DevModCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('dev')
                .then(
                    argument<T, boolean>('bool', BoolArgumentType.bool())
                        .executes(ctx => {
                            const arg = ctx.args.get('bool');
                            if (arg === undefined) {
                                throw new IllegalArgumentError('<bool> can not be empty');
                            }

                            const bool = arg.result;
                            if (typeof bool !== 'boolean') {
                                throw new IllegalArgumentError('Must provide a boolean');
                            }

                            this.setMode(ctx.source, bool);
                        })
                )
                .executes(ctx => this.setMode(ctx.source))
                .requires(source => source.hasPermissionLevel(8))
        );
    }

    private static setMode(source: ServerCommandSource, bool?: boolean) {
        const entity = source.entity;
        if (!(entity instanceof ServerPlayerEntity)) {
            throw new IllegalArgumentError('Target not a player');
        }

        entity.setDevMode(bool ?? !entity.isDevMode());
        (source.getWorld() as ServerWorld)?.getNetworkChannel().sendTo(
            new SyncPlayerProfileS2CPacket(entity.isDevMode()),
            entity.getProfile().clientId
        );

        source.outPut.sendMessage(`Set dev mode \x1b[32m${bool}`);
    }
}