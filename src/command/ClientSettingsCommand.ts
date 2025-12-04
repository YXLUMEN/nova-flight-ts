import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/builder/CommandNodeBuilder.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {invoke} from "@tauri-apps/api/core";
import {CommandError, IllegalArgumentError} from "../apis/errors.ts";
import {IntArgumentType} from "./argument/IntArgumentType.ts";
import {NormalStringArgumentType} from "./argument/NormalStringArgumentType.ts";
import {ServerDB} from "../server/ServerDB.ts";
import {clamp} from "../utils/math/math.ts";

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
                                            WorldConfig.serverAddr = ip;
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
                                            WorldConfig.port = port;
                                            ctx.source.addMessage(`Set port: \x1b[32m"${port}"`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('open')
                                .executes(() => invoke('set_open'))
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
                                                throw new IllegalArgumentError('\x1b[31mUsername cannot be empty');
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

                                            let fps = Number(arg.result);
                                            if (!Number.isSafeInteger(fps)) {
                                                throw new IllegalArgumentError(`\x1b[31mInvalid argument: "${fps}", int must be an integer`);
                                            }
                                            if (fps <= 0) {
                                                throw new IllegalArgumentError("\x1b[31mFps should greater than 0");
                                            }
                                            fps = clamp(fps, 0, 165);
                                            WorldConfig.fps = fps;
                                            WorldConfig.perFrame = 1000 / fps;
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
                                    ctx.source.addMessage(`Current address \x1b[32m"${WorldConfig.serverAddr}"`);
                                })
                        )
                        .then(
                            literal<T>('port')
                                .executes(ctx => {
                                    ctx.source.addMessage(`Current port is: \x1b[32m"${WorldConfig.port}"`);
                                })
                        )
                        .then(
                            literal<T>('open')
                                .executes(async ctx => {
                                    const isOpen = await invoke('is_open');
                                    let message = isOpen ?
                                        `World is open on \x1b[32m"${WorldConfig.port}"` :
                                        `No open on web`;
                                    ctx.source.addMessage(message);
                                })
                        )
                        .then(
                            literal<T>('playerName')
                                .executes(ctx => {
                                    const playerName = localStorage.getItem('playerName') ?? '<null>';
                                    ctx.source.addMessage(`Current playerName is: \x1b[32m"${playerName}"`);
                                })
                        )
                )
                .then(
                    literal<T>('clear')
                        .then(
                            literal<T>('playerName')
                                .executes(ctx => {
                                    const playerName = localStorage.getItem('playerName') ?? '<null>';
                                    localStorage.removeItem('playerName');
                                    ctx.source.addMessage(`\x1b[32mClear playerName, used be: ${playerName}`);
                                })
                        )
                )
                .then(
                    literal<T>('force')
                        .then(
                            literal<T>('shutdown')
                                .executes(ctx => {
                                    ctx.source.getClient().scheduleStop();
                                })
                        )
                        .then(
                            literal<T>('shut_relay')
                                .executes(() => {
                                    return invoke('stop_server');
                                })
                        )
                        .then(
                            literal<T>('reset_tutorial')
                                .executes(() => {
                                    return ServerDB.db.delete('user_info', 'tutorial');
                                })
                        )
                )
        );
    }
}