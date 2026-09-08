import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {RuntimeConfig} from "../configs/RuntimeConfig.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {invoke} from "@tauri-apps/api/core";
import {CommandError, IllegalArgumentError} from "../type/errors.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {ServerStorage} from "../server/storage/ServerStorage.ts";
import {NovaFlightClient} from "../client/NovaFlightClient.ts";
import {BoolArgumentType} from "./argument/BoolArgumentType.ts";
import {error} from "@tauri-apps/plugin-log";
import {Settings} from "../client/settings/Settings.ts";

export class ClientSettingsCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('client')
                .then(
                    literal<T>('set')
                        .then(
                            literal<T>('server_addr')
                                .then(
                                    argument<T, string>('address', NormalStringArgumentType.normalString())
                                        .executes(ctx => {
                                            const arg = ctx.args.get('address');
                                            if (!arg) throw new CommandError('Url cannot be empty');

                                            const ip = arg.result;
                                            if (typeof ip !== 'string') {
                                                throw new IllegalArgumentError(`\x1b[31mInvalid argument: ${ip}, Address must be a string`);
                                            }
                                            if (ip.length < 9) {
                                                throw new IllegalArgumentError(`\x1b[31mAddress length must be at least 9 characters, but current is ${ip.length}`);
                                            }
                                            RuntimeConfig.serverAddr = ip;
                                            ctx.source.addMessage(`Set address to: \x1b[32m"${ip}"`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('port')
                                .then(
                                    argument<T, number>('port', IntArgumentType.int())
                                        .executes(ctx => {
                                            const arg = ctx.args.get('port');
                                            if (!arg) throw new CommandError('\x1b[31m<port> is required');

                                            let port = Number(arg.result);
                                            if (!Number.isSafeInteger(port)) {
                                                throw new IllegalArgumentError(`\x1b[31mInvalid argument: "${port}", port must be an integer`);
                                            }
                                            if (port < 0 || port > 65535) {
                                                throw new IllegalArgumentError("\x1b[31mPort must in 0-65535");
                                            }
                                            RuntimeConfig.port = port;
                                            ctx.source.addMessage(`Set port: \x1b[32m"${port}"`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('open')
                                .then(
                                    argument<T, boolean>('open', BoolArgumentType.bool())
                                        .executes(async (ctx) => {
                                            const arg = ctx.args.get('open');
                                            if (!arg) throw new CommandError('\x1b[31m<open> is required');

                                            const bl: unknown = arg.result;
                                            if (typeof bl !== 'boolean') {
                                                throw new IllegalArgumentError(`\x1b[31mUnexpected value: ${bl} \x1b[0m`);
                                            }

                                            const success: boolean = await invoke('set_open', {bl});
                                            if (!success) {
                                                throw new CommandError(bl ? '\x1b[31mCannot open on LAN' : '\x1b[31mCannot close port');
                                            }

                                            NovaFlightClient.getInstance().requestStop();

                                            RuntimeConfig.generalMode = bl;
                                            ctx.source.addMessage(bl ? 'Now is open on LAN' : 'Close port');
                                        })
                                )
                        )
                        .then(
                            literal<T>('playerName')
                                .then(
                                    argument<T, string>('playerName', NormalStringArgumentType.normalString())
                                        .executes(ctx => {
                                            const arg = ctx.args.get('playerName');
                                            if (!arg) return;

                                            const playerName = String(arg.result);
                                            if (playerName.length < 1) {
                                                throw new IllegalArgumentError('\x1b[31mPlayer name cannot be empty');
                                            }
                                            if (playerName.length > 64) {
                                                throw new IllegalArgumentError('\x1b[31mPlayer name cannot longer then 64 char');
                                            }

                                            localStorage.setItem('playerName', playerName);
                                            ctx.source.getClient().playerName = playerName;
                                            ctx.source.addMessage(`Set playerName to: \x1b[32m"${playerName}"`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('max_fps')
                                .then(
                                    argument<T, number>('int', IntArgumentType.int())
                                        .executes(ctx => {
                                            const arg = ctx.args.get('int');
                                            if (!arg) throw new CommandError('\x1b[31m<int> is required');

                                            const fps = Number(arg.result);
                                            const result = Settings.FPS.set(fps);
                                            if (result.isErr()) {
                                                ctx.source.addMessage(`\x1b[31mInvalid argument: "${fps}", value must be an integer and between 2-240`);
                                                return;
                                            }

                                            ctx.source.addMessage(`Set Maxfps: \x1b[32m"${fps}"`);
                                        })
                                )
                        )
                )
                .then(
                    literal<T>('get')
                        .then(
                            literal<T>('server_addr')
                                .executes(ctx => {
                                    ctx.source.addMessage(`Current address \x1b[32m"${RuntimeConfig.serverAddr}"`);
                                })
                        )
                        .then(
                            literal<T>('port')
                                .executes(ctx => {
                                    ctx.source.addMessage(`Current port is: \x1b[32m"${RuntimeConfig.port}"`);
                                })
                        )
                        .then(
                            literal<T>('open')
                                .executes(async ctx => {
                                    const isOpen = await invoke('is_open');
                                    let message = isOpen ?
                                        `World is open on \x1b[32m"${RuntimeConfig.port}"` :
                                        `No open on web`;
                                    ctx.source.addMessage(message);
                                })
                        )
                        .then(
                            literal<T>('playerName')
                                .executes(ctx => {
                                    const playerName = localStorage.getItem('playerName') ?? '<player>';
                                    ctx.source.addMessage(`Current playerName is: \x1b[32m"${playerName}"`);
                                })
                        )
                )
                .then(
                    literal<T>('clear')
                        .then(
                            literal<T>('playerName')
                                .executes(ctx => {
                                    const playerName = localStorage.getItem('playerName') ?? '<player>';
                                    localStorage.removeItem('playerName');
                                    ctx.source.addMessage(`\x1b[32mClear playerName, used be: ${playerName}`);
                                })
                        )
                )
                .then(
                    literal<T>('force')
                        .then(
                            literal<T>('stop_game')
                                .executes(ctx => {
                                    ctx.source.getClient().requestStop();
                                    ctx.source.addMessage('Schedule to stop the game');
                                })
                        )
                        .then(
                            literal<T>('shut_relay')
                                .executes(async (ctx) => {
                                    const result = await invoke<boolean>('stop_server');
                                    ctx.source.addMessage(result ? 'Stopping server' : 'Server not running');
                                })
                        )
                        .then(
                            literal<T>('reset_tutorial')
                                .executes(async (ctx) => {
                                    const result = await ServerStorage.db.delete('user_info', 'tutorial');
                                    if (result.isOk()) {
                                        ctx.source.addMessage('Reset success');
                                        return;
                                    }

                                    await error(result.unwrapErr().toString());
                                    ctx.source.addMessage('Action failed, the detail will write to log');
                                })
                        )
                        .then(
                            literal<T>('reload_settings')
                                .executes(async ctx => {
                                    await Settings.OPTIONS.load();
                                    ctx.source.addMessage('Settings reloaded');
                                })
                        )
                )
        );
    }
}