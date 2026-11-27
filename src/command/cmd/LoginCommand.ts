import type {ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import type {EntitySelector} from "../EntitySelector.ts";
import type {ServerPlayerEntity} from "../../server/entity/ServerPlayerEntity.ts";
import type {UUID} from "../../type/types.ts";
import type {CommandOutput} from "../../server/command/CommandOutput.ts";
import {argument, literal} from "../../brigadier/builder/CommandNodeBuilder.ts";
import {isValidUUID} from "../../utils/uuid_util.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {NormalStringArgumentType} from "../argument/NormalStringArgumentType.ts";
import {CommandUtil} from "../CommandUtil.ts";
import {PlayerLogin} from "../../server/storage/PlayerLogin.ts";
import {ServerStorage} from "../../server/storage/ServerStorage.ts";
import {EntitySelectorArgumentType} from "../argument/EntitySelectorArgumentType.ts";

export class LoginCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('login')
                .then(
                    literal<T>('un_registry')
                        .then(
                            literal<T>('player')
                                .then(
                                    argument<T, EntitySelector>('player', EntitySelectorArgumentType.player())
                                        .executes(ctx => {
                                            if (isClient) return;
                                            const selector = CommandUtil.assertSelector(ctx, 'player');
                                            const player = selector.getPlayer(ctx.source) as ServerPlayerEntity;
                                            void this.doUnregister(ctx.source.outPut, player.profile().clientId);
                                        })
                                )
                        )
                        .then(
                            literal<T>('uuid')
                                .then(
                                    argument<T, string>('uuid', NormalStringArgumentType.normalString())
                                        .executes(ctx => {
                                            if (isClient) return;
                                            const uuid = CommandUtil.assert(ctx, 'uuid', String);
                                            if (!isValidUUID(uuid)) {
                                                ctx.source.outPut.sendMessage('invalid uuid');
                                                return;
                                            }

                                            void this.doUnregister(ctx.source.outPut, uuid);
                                        })
                                )
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(9);
                })
        );
    }

    private static async doUnregister(output: CommandOutput, uuid: UUID) {
        const result = await PlayerLogin.unRegistry(ServerStorage.DB, uuid);
        if (result.isErr()) {
            output.sendMessage(String(result.unwrapErr()));
            return;
        }
        output.sendMessage(`UnRegistry "${uuid}"`);
    }
}