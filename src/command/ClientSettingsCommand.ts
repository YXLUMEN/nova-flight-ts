import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/CommandNodeBuilder.ts";
import type {StringReader} from "../brigadier/StringReader.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";

export function clientSettingsCommand(dispatcher: CommandDispatcher<any>) {
    dispatcher.registry(
        literal('client')
            .then(
                literal('serverIp')
                    .then(
                        argument<any, string>('address', {
                            parse(reader: StringReader): string {
                                return reader.readQuotedString().trim();
                            }
                        })
                            .executes(ctx => {
                                const arg = ctx.args.get('address');
                                if (!arg) throw new Error('Url cannot be empty');

                                const ip = arg.result;
                                if (typeof ip !== 'string') throw new Error(`Invalid argument: ${ip}, Address must be a string`);
                                WorldConfig.serverUrl = ip;
                            })
                    )
            )
            .then(
                literal('port')
                    .then(
                        argument<any, string>('port', {
                            parse(reader: StringReader): string {
                                return reader.readUnquotedString().trim();
                            }
                        })
                            .executes(ctx => {
                                const arg = ctx.args.get('port');
                                if (!arg) return;

                                let port = arg.result;
                                if (typeof port !== 'number' || !Number.isSafeInteger(port)) {
                                    throw new Error(`Invalid argument: ${port}, port must be an integer`);
                                }
                                if (port < 0 || port > 65535) {
                                    throw new RangeError("Port must in 0-65535");
                                }

                                WorldConfig.port = port ?? 25565;
                            })
                    )
            )
            .then(
                literal('username')
                    .then(
                        literal('set')
                            .then(
                                argument<any, string>('username', {
                                    parse(reader: StringReader): string {
                                        return reader.readString().trim();
                                    }
                                })
                                    .executes(ctx => {
                                        const arg = ctx.args.get('username');
                                        if (!arg) return;

                                        const username = String(arg.result);
                                        localStorage.setItem('username', username);
                                    })
                            )
                    )
                    .then(
                        literal('clear')
                            .executes(() => localStorage.removeItem('username'))
                    )
            )
    );
}