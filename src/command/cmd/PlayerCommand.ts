import type {ServerCommandSource} from "../../server/command/ServerCommandSource.ts";
import type {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import type {UUID} from "../../type/types.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {argument, literal} from "../../brigadier/builder/CommandNodeBuilder.ts";
import {uuidFromString} from "../../utils/uuid_util.ts";
import {isClient} from "../../configs/RuntimeConfig.ts";
import {PlayerSelectorArgumentType} from "../argument/PlayerSelectorArgumentType.ts";
import {CommandUtil} from "../CommandUtil.ts";
import {FakePlayer} from "../../server/entity/FakePlayer.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {GameProfile} from "../../server/entity/GameProfile.ts";
import {FakeConnection} from "../../server/network/FakeConnection.ts";
import {Log} from "../../utils/Log.ts";
import type {CommandContext} from "../../brigadier/context/CommandContext.ts";

export class PlayerCommand {
    public static registry<T extends ServerCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('player')
                .then(
                    argument<T, string>('name', PlayerSelectorArgumentType.selector())
                        .then(
                            literal<T>('spawn')
                                .executes(async ctx => {
                                    if (isClient) return;
                                    const world = CommandUtil.assertWorld(ctx) as ServerWorld;
                                    const name = CommandUtil.assert(ctx, 'name', String);
                                    const uuid: UUID = await uuidFromString(name);

                                    const manager = ctx.source.server.playerManager;
                                    if (manager.hasLogin(uuid)) {
                                        ctx.source.outPut.sendMessage(`Player "${name}" already exist`);
                                        return;
                                    }

                                    const disposer = manager.addLogin(uuid);
                                    try {
                                        const pos = ctx.source.position;
                                        const connection = new FakeConnection(uuid);
                                        const profile = new GameProfile(0, uuid, name);
                                        const player = new FakePlayer(EntityTypes.PLAYER, world, profile);
                                        player.snapTo(pos.x, pos.y, -1.57079);
                                        manager.placePlayer(connection, profile, player);
                                    } catch (err) {
                                        Log.error(err);
                                        ctx.source.outPut.sendMessage(`spawn fail`);
                                    } finally {
                                        disposer();
                                    }
                                })
                        )
                        .then(
                            literal<T>('kill')
                                .executes(ctx => {
                                    if (isClient) return;
                                    const name = CommandUtil.assert(ctx, 'name', String);
                                    const manager = ctx.source.server.playerManager;
                                    const player = manager.getPlayerByName(name);
                                    if (player instanceof FakePlayer) {
                                        manager.removePlayer(player);
                                    } else {
                                        ctx.source.outPut.sendMessage(`Player "${name}" is not a fake player`);
                                    }
                                })
                        )
                        .then(
                            literal<T>('fire')
                                .executes(ctx => {
                                    if (isClient) return;
                                    const player = getFakePlayer(ctx);
                                    if (player) player.setFiring(!player.wasFiring);
                                })
                        )
                        .then(
                            literal<T>('switch_main')
                                .executes(ctx => {
                                    if (isClient) return;
                                    const player = getFakePlayer(ctx);
                                    if (player) player.switchWeapon(1);
                                })
                        )
                )
                .requires(source => {
                    return source.hasPermissionLevel(8);
                })
        );
    }
}

function getFakePlayer<T extends ServerCommandSource>(ctx: CommandContext<T>, name?: string) {
    name = name ?? CommandUtil.assert(ctx, 'name', String);
    const manager = ctx.source.server.playerManager;
    const player = manager.getPlayerByName(name);
    if (player instanceof FakePlayer) {
        return player;
    }
    return null;
}