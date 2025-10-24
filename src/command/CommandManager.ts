import {CommandDispatcher} from "../brigadier/CommandDispatcher.ts";
import type {ParseResults} from "../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../server/command/ServerCommandSource.ts";
import type {CommandSource} from "./CommandSource.ts";
import type {Consumer} from "../apis/types.ts";

export abstract class CommandManager {
    protected readonly dispatcher: CommandDispatcher<ServerCommandSource> = new CommandDispatcher();
    private readonly callback: Consumer<Error[]>;

    protected constructor(callback: Consumer<Error[]>) {
        this.callback = callback;
    }

    public executeWithPrefix(source: ServerCommandSource, input: string): void {
        const command = input.startsWith("/") ? input.slice(1) : input;
        this.execute(this.dispatcher.parse(command, source), command);
    }

    public execute(parseResults: ParseResults<ServerCommandSource>, command: string): void {
        try {
            const contextBuilder = parseResults.context;

            const context = contextBuilder.build(command);
            const lastNode = context.nodes[context.nodes.length - 1];
            if (!lastNode) {
                // noinspection ExceptionCaughtLocallyJS
                throw Error(`No such command: "${command}"`);
            }

            const cmd = lastNode.getCommand();
            if (!cmd) {
                // noinspection ExceptionCaughtLocallyJS
                throw Error(`Command "${lastNode.getName()}" is not executable, with command: "${command}"`);
            }
            cmd(context);
        } catch (err) {
            console.error(`Failed to execute command for command "${command}"`);

            const errors: Error[] = [];
            if (parseResults.exceptions.size > 0) {
                for (const exception of parseResults.exceptions.values()) {
                    console.warn(exception);
                }
                errors.push(...parseResults.exceptions.values());
            }
            if (err instanceof Error) {
                errors.push(err);
            }

            if (errors.length > 0) this.callback(errors);
        }
    }

    public abstract registry(source: CommandSource): void;
}