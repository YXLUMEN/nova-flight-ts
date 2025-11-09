import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/CommandNodeBuilder.ts";
import type {StringReader} from "../brigadier/StringReader.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";
import {invoke} from "@tauri-apps/api/core";
import {CommandError, IllegalArgumentError} from "../apis/errors.ts";

export class ClientSettingsCommand {
    public static registry<T extends ClientCommandSource>(dispatcher: CommandDispatcher<T>) {
        dispatcher.registry(
            literal<T>('client')
                .then(
                    literal<T>('set')
                        .then(
                            literal<T>('server_addr')
                                .then(
                                    argument<T, string>('address', {
                                        parse(reader: StringReader): string {
                                            return reader.readQuotedString().trim();
                                        }
                                    })
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
                                            ctx.source.addMessage(`\x1b[32mSet address to: ${ip}`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('port')
                                .then(
                                    argument<T, number>('port', {
                                        parse(reader: StringReader): number {
                                            return reader.readInt();
                                        }
                                    })
                                        .executes(ctx => {
                                            const arg = ctx.args.get('port');
                                            if (!arg) throw new CommandError('\x1b[31m<port> is required', 'warning');

                                            let port = Number(arg.result);
                                            if (!Number.isSafeInteger(port)) {
                                                throw new IllegalArgumentError(`\x1b[31mInvalid argument: ${port}, port must be an integer`);
                                            }
                                            if (port < 0 || port > 65535) {
                                                throw new IllegalArgumentError("\x1b[31mPort must in 0-65535");
                                            }
                                            WorldConfig.port = port;
                                            ctx.source.addMessage(`\x1b[32mSet port: ${port}`);
                                        })
                                )
                        )
                        .then(
                            literal<T>('username')
                                .then(
                                    argument<T, string>('username', {
                                        parse(reader: StringReader): string {
                                            return reader.readString().trim();
                                        }
                                    })
                                        .executes(ctx => {
                                            const arg = ctx.args.get('username');
                                            if (!arg) return;

                                            const username = String(arg.result);
                                            if (username.length < 1) {
                                                throw new IllegalArgumentError('\x1b[31mUsername cannot be empty');
                                            }

                                            localStorage.setItem('username', username);
                                            ctx.source.addMessage(`\x1b[32mSet username to: "${username}"`);
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
                )
                .then(
                    literal<T>('clear')
                        .then(
                            literal<T>('username')
                                .executes(ctx => {
                                    const username = localStorage.getItem('username') ?? '<null>';
                                    localStorage.removeItem('username');
                                    ctx.source.addMessage(`\x1b[32mClear username, used be: ${username}`);
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
                )
        );
    }
}