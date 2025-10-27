import type {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import {argument, literal} from "../brigadier/CommandNodeBuilder.ts";
import type {StringReader} from "../brigadier/StringReader.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";
import type {ClientCommandSource} from "../client/command/ClientCommandSource.ts";

export function clientSettingsCommand(dispatcher: CommandDispatcher<any>) {
    dispatcher.registry(
        literal<ClientCommandSource>('client')
            .then(
                literal<ClientCommandSource>('set')
                    .then(
                        literal<ClientCommandSource>('serverAddr')
                            .then(
                                argument<ClientCommandSource, string>('address', {
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
                        literal<ClientCommandSource>('port')
                            .then(
                                argument<ClientCommandSource, number>('port', {
                                    parse(reader: StringReader): number {
                                        return reader.readInt();
                                    }
                                })
                                    .executes(ctx => {
                                        const arg = ctx.args.get('port');
                                        if (!arg) return;

                                        let port = arg.result;
                                        if (!Number.isSafeInteger(port)) {
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
                        literal<ClientCommandSource>('username')
                            .then(
                                argument<ClientCommandSource, string>('username', {
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
            )
            .then(
                literal<ClientCommandSource>('get')
            )
            .then(
                literal<ClientCommandSource>('clear')
                    .then(
                        literal<ClientCommandSource>('username')
                            .executes(() => localStorage.removeItem('username'))
                    )
            )
            .then(
                literal<ClientCommandSource>('force')
                    .then(
                        literal<ClientCommandSource>('shutdown')
                            .executes(ctx => {
                                ctx.source.getClient().scheduleStop();
                            })
                    )
            )
    );
}